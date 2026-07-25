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
    this.peerConnection = null;
    this.dataChannel = null;
    this.peerId = null;
    this.isInitiator = false;

    // Incoming file reception state
    this.incomingFileHeader = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;
    this.receiveStartTime = 0;

    // Callbacks
    this.onConnectionChange = null;
    this.onProgress = null;
    this.onFileReceived = null;
  }

  init(peerId, isInitiator, onConnectionChange, onProgress, onFileReceived) {
    this.peerId = peerId;
    this.isInitiator = isInitiator;
    this.onConnectionChange = onConnectionChange;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;

    this.createPeerConnection();

    if (isInitiator) {
      this.createDataChannel();
      this.sendOffer();
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(DEFAULT_RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal(this.peerId, { candidate: event.candidate });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.log('🧊 ICE State changed:', state);
      if (this.onConnectionChange) this.onConnectionChange(state);
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('📡 Data channel received from remote peer');
      this.dataChannel = event.channel;
      this.setupDataChannelEvents();
    };
  }

  createDataChannel() {
    console.log('📡 Creating data channel (Initiator)');
    this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
      ordered: true
    });
    this.setupDataChannelEvents();
  }

  setupDataChannelEvents() {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log('✅ DataChannel is OPEN!');
      if (this.onConnectionChange) this.onConnectionChange('connected');
    };

    this.dataChannel.onclose = () => {
      console.log('🔌 DataChannel closed');
      if (this.onConnectionChange) this.onConnectionChange('disconnected');
    };

    this.dataChannel.onerror = (error) => {
      console.error('❌ DataChannel error:', error);
    };

    this.dataChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
  }

  async handleSignal(signal) {
    if (!this.peerConnection) return;

    try {
      if (signal.offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socketService.sendSignal(this.peerId, { answer });
      } else if (signal.answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  }

  async sendOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socketService.sendSignal(this.peerId, { offer });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }

  // File Transfer Logic (Sender side)
  async sendFiles(fileList) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel is not ready for sending.');
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      await this.sendFile(file, i + 1, fileList.length);
    }
  }

  async sendFile(file, currentIndex, totalFiles) {
    return new Promise((resolve) => {
      const header = JSON.stringify({
        type: 'header',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        currentIndex,
        totalFiles
      });

      this.dataChannel.send(header);

      let offset = 0;
      const startTime = Date.now();
      const reader = new FileReader();

      const sendNextChunk = () => {
        if (offset >= file.size) {
          // Send completion signal
          this.dataChannel.send(JSON.stringify({ type: 'end', name: file.name }));
          resolve();
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
          resolve();
          return;
        }

        this.dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;

        const now = Date.now();
        const elapsed = (now - startTime) / 1000; // in seconds
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

        // Backpressure monitoring
        if (this.dataChannel.bufferedAmount > 8 * 1024 * 1024) {
          // 8MB threshold
          setTimeout(sendNextChunk, 50);
        } else {
          setTimeout(sendNextChunk, 1);
        }
      };

      sendNextChunk();
    });
  }

  // Incoming Message Handler (Receiver side)
  handleIncomingMessage(data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'header') {
          this.incomingFileHeader = msg;
          this.receivedChunks = [];
          this.receivedBytes = 0;
          this.receiveStartTime = Date.now();
        } else if (msg.type === 'end') {
          // Reassemble Blob
          const blob = new Blob(this.receivedChunks, { type: this.incomingFileHeader.mimeType });
          const file = new File([blob], this.incomingFileHeader.name, {
            type: this.incomingFileHeader.mimeType
          });

          if (this.onFileReceived) {
            this.onFileReceived({
              file,
              blobUrl: URL.createObjectURL(blob),
              name: this.incomingFileHeader.name,
              size: this.incomingFileHeader.size,
              mimeType: this.incomingFileHeader.mimeType
            });
          }

          // Reset incoming state
          this.incomingFileHeader = null;
          this.receivedChunks = [];
          this.receivedBytes = 0;
        }
      } catch (err) {
        console.error('Error parsing JSON text message:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      if (!this.incomingFileHeader) return;

      this.receivedChunks.push(data);
      this.receivedBytes += data.byteLength;

      const now = Date.now();
      const elapsed = (now - this.receiveStartTime) / 1000;
      const speed = elapsed > 0 ? this.receivedBytes / elapsed : 0;
      const remainingBytes = this.incomingFileHeader.size - this.receivedBytes;
      const eta = speed > 0 ? remainingBytes / speed : 0;
      const progress = Math.min(100, Math.round((this.receivedBytes / this.incomingFileHeader.size) * 100));

      if (this.onProgress) {
        this.onProgress({
          direction: 'receive',
          fileName: this.incomingFileHeader.name,
          fileSize: this.incomingFileHeader.size,
          progress,
          speed,
          eta,
          currentIndex: this.incomingFileHeader.currentIndex,
          totalFiles: this.incomingFileHeader.totalFiles
        });
      }
    }
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export const webRtcService = new WebRtcService();
