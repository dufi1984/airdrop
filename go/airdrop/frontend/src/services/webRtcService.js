import { socketService } from './socketService';

const CHUNK_SIZE = 64 * 1024; // 64KB per WebRTC binary chunk

const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

class WebRtcService {
  constructor() {
    // Map of peerId -> { peerConnection, dataChannel, state }
    this.peers = new Map();

    // Callbacks
    this.onPeerStateChange = null;
    this.onProgress = null;
    this.onFileReceived = null;

    // Receiver state per sender
    this.incomingHeaders = new Map();
    this.receivedChunksMap = new Map();
    this.receivedBytesMap = new Map();
    this.receiveStartTimes = new Map();
  }

  setCallbacks(onPeerStateChange, onProgress, onFileReceived) {
    this.onPeerStateChange = onPeerStateChange;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
  }

  // Create peer connection for a specific peer ID
  createPeer(peerId, isInitiator) {
    if (this.peers.has(peerId)) return this.peers.get(peerId);

    const pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);
    let dc = null;

    const peerObj = {
      peerId,
      pc,
      dc: null,
      state: 'connecting'
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal(peerId, { candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`🧊 ICE State [${peerId}]:`, state);
      peerObj.state = state;
      if (this.onPeerStateChange) this.onPeerStateChange(peerId, state);
    };

    pc.ondatachannel = (event) => {
      console.log(`📡 DataChannel received from ${peerId}`);
      peerObj.dc = event.channel;
      this.setupDataChannel(peerId, peerObj.dc);
    };

    if (isInitiator) {
      dc = pc.createDataChannel('fileTransfer', { ordered: true });
      peerObj.dc = dc;
      this.setupDataChannel(peerId, dc);
      this.sendOffer(peerId, pc);
    }

    this.peers.set(peerId, peerObj);
    return peerObj;
  }

  setupDataChannel(peerId, dc) {
    if (!dc) return;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      console.log(`✅ DataChannel OPEN with ${peerId}`);
      if (this.onPeerStateChange) this.onPeerStateChange(peerId, 'connected');
    };

    dc.onclose = () => {
      console.log(`🔌 DataChannel closed with ${peerId}`);
      this.removePeer(peerId);
      if (this.onPeerStateChange) this.onPeerStateChange(peerId, 'disconnected');
    };

    dc.onerror = (err) => console.error(`❌ DataChannel error [${peerId}]:`, err);

    dc.onmessage = (event) => {
      this.handleIncomingMessage(peerId, event.data);
    };
  }

  async sendOffer(peerId, pc) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendSignal(peerId, { offer });
    } catch (err) {
      console.error(`Error sending offer to ${peerId}:`, err);
    }
  }

  async handleSignal(fromPeerId, signal) {
    let peerObj = this.peers.get(fromPeerId);
    if (!peerObj) {
      peerObj = this.createPeer(fromPeerId, false);
    }

    const { pc } = peerObj;

    try {
      if (signal.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendSignal(fromPeerId, { answer });
      } else if (signal.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error(`Signal handling error from ${fromPeerId}:`, err);
    }
  }

  // File Transfer Logic
  async sendFilesToPeer(peerId, fileList) {
    const peerObj = this.peers.get(peerId);
    if (!peerObj || !peerObj.dc || peerObj.dc.readyState !== 'open') {
      console.error(`Data channel not ready for ${peerId}`);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      await this.sendFileToDc(peerObj.dc, file, i + 1, fileList.length);
    }
  }

  async sendFilesToAll(targetPeerIds, fileList) {
    for (const peerId of targetPeerIds) {
      await this.sendFilesToPeer(peerId, fileList);
    }
  }

  async sendFileToDc(dc, file, currentIndex, totalFiles) {
    return new Promise((resolve) => {
      const header = JSON.stringify({
        type: 'header',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        currentIndex,
        totalFiles
      });

      dc.send(header);

      let offset = 0;
      const startTime = Date.now();
      const reader = new FileReader();

      const sendNextChunk = () => {
        if (offset >= file.size) {
          dc.send(JSON.stringify({ type: 'end', name: file.name }));
          resolve();
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (!dc || dc.readyState !== 'open') {
          resolve();
          return;
        }

        dc.send(e.target.result);
        offset += e.target.result.byteLength;

        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const speed = elapsed > 0 ? offset / elapsed : 0;
        const remainingBytes = file.size - offset;
        const eta = speed > 0 ? remainingBytes / speed : 0;
        const progress = Math.min(100, Math.round((offset / file.size) * 100));

        if (this.onProgress) {
          this.onProgress({
            direction: 'send',
            fileName: file.name,
            fileSize: file.size,
            progress,
            speed,
            eta,
            currentIndex,
            totalFiles
          });
        }

        if (dc.bufferedAmount > 8 * 1024 * 1024) {
          setTimeout(sendNextChunk, 50);
        } else {
          setTimeout(sendNextChunk, 1);
        }
      };

      sendNextChunk();
    });
  }

  // Incoming Message Handler
  handleIncomingMessage(peerId, data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'header') {
          this.incomingHeaders.set(peerId, msg);
          this.receivedChunksMap.set(peerId, []);
          this.receivedBytesMap.set(peerId, 0);
          this.receiveStartTimes.set(peerId, Date.now());
        } else if (msg.type === 'end') {
          const header = this.incomingHeaders.get(peerId);
          const chunks = this.receivedChunksMap.get(peerId) || [];

          if (header) {
            const blob = new Blob(chunks, { type: header.mimeType });
            const file = new File([blob], header.name, { type: header.mimeType });

            if (this.onFileReceived) {
              this.onFileReceived({
                file,
                blobUrl: URL.createObjectURL(blob),
                name: header.name,
                size: header.size,
                mimeType: header.mimeType,
                fromPeerId: peerId
              });
            }
          }

          this.incomingHeaders.delete(peerId);
          this.receivedChunksMap.delete(peerId);
          this.receivedBytesMap.delete(peerId);
        }
      } catch (err) {
        console.error('Error parsing JSON:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      const header = this.incomingHeaders.get(peerId);
      if (!header) return;

      const chunks = this.receivedChunksMap.get(peerId) || [];
      chunks.push(data);
      this.receivedChunksMap.set(peerId, chunks);

      const currentBytes = (this.receivedBytesMap.get(peerId) || 0) + data.byteLength;
      this.receivedBytesMap.set(peerId, currentBytes);

      const startTime = this.receiveStartTimes.get(peerId) || Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? currentBytes / elapsed : 0;
      const remainingBytes = header.size - currentBytes;
      const eta = speed > 0 ? remainingBytes / speed : 0;
      const progress = Math.min(100, Math.round((currentBytes / header.size) * 100));

      if (this.onProgress) {
        this.onProgress({
          direction: 'receive',
          fileName: header.name,
          fileSize: header.size,
          progress,
          speed,
          eta,
          currentIndex: header.currentIndex,
          totalFiles: header.totalFiles
        });
      }
    }
  }

  removePeer(peerId) {
    const peerObj = this.peers.get(peerId);
    if (peerObj) {
      if (peerObj.dc) peerObj.dc.close();
      if (peerObj.pc) peerObj.pc.close();
      this.peers.delete(peerId);
    }
  }

  closeAll() {
    this.peers.forEach((peerObj) => {
      if (peerObj.dc) peerObj.dc.close();
      if (peerObj.pc) peerObj.pc.close();
    });
    this.peers.clear();
  }
}

export const webRtcService = new WebRtcService();
