import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';

const CHUNK_SIZE = 64 * 1024; // 64KB raw binary WebRTC chunks
const MAX_SLOTS = 6;
const SLOT_PREFIX = 'airdrop-p2p-v4-';

class PeerNetworkService {
  constructor() {
    this.peer = null;
    this.myId = null;
    this.mySlotIndex = null;
    this.myDeviceName = detectDeviceName();

    // Map of peerId -> connection object
    this.connections = new Map();
    // Map of peerId -> { id, deviceInfo }
    this.onlineDevices = new Map();

    // Callbacks
    this.onStatusChange = null;
    this.onDevicesUpdate = null;
    this.onProgress = null;
    this.onFileReceived = null;

    // Receiver state per sender
    this.incomingHeaders = new Map();
    this.receivedChunksMap = new Map();
    this.receivedBytesMap = new Map();
    this.receiveStartTimes = new Map();

    this.probeTimer = null;
    this.isDestroyed = false;
  }

  init(onStatusChange, onDevicesUpdate, onProgress, onFileReceived) {
    this.onStatusChange = onStatusChange;
    this.onDevicesUpdate = onDevicesUpdate;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
    this.isDestroyed = false;

    this.tryClaimSlot(1);
  }

  tryClaimSlot(slotIndex) {
    if (slotIndex > MAX_SLOTS || this.isDestroyed) return;

    const slotId = `${SLOT_PREFIX}${slotIndex}`;

    try {
      const peer = new Peer(slotId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 0,
      });

      peer.on('open', (id) => {
        console.log(`✅ Connected slot #${slotIndex}:`, id);
        this.peer = peer;
        this.myId = id;
        this.mySlotIndex = slotIndex;

        if (this.onStatusChange) this.onStatusChange(true);

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.startProbing();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          peer.destroy();
          this.tryClaimSlot(slotIndex + 1);
        } else {
          console.warn('Peer error:', err.type);
        }
      });

      peer.on('disconnected', () => {
        if (this.onStatusChange) this.onStatusChange(false);
        if (this.peer && !this.peer.destroyed) {
          setTimeout(() => {
            try { this.peer.reconnect(); } catch (e) {}
          }, 1000);
        }
      });
    } catch (e) {
      console.error('Peer init error:', e);
    }
  }

  startProbing() {
    this.probeOtherSlots();
    this.probeTimer = setInterval(() => {
      this.probeOtherSlots();
    }, 5000);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;

      const targetSlotId = `${SLOT_PREFIX}${i}`;
      if (!this.connections.has(targetSlotId)) {
        this.connectToSlot(targetSlotId);
      }
    }

    this.notifyDevicesUpdate();
  }

  connectToSlot(targetSlotId) {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    try {
      const conn = this.peer.connect(targetSlotId, {
        metadata: { deviceInfo: this.myDeviceName },
        reliable: true
      });

      this.setupConnectionEvents(conn);
    } catch (err) {}
  }

  handleIncomingConnection(conn) {
    this.setupConnectionEvents(conn);
  }

  setupConnectionEvents(conn) {
    conn.on('open', () => {
      console.log(`🤝 Connected with ${conn.peer}`);
      
      const peerDeviceInfo = conn.metadata?.deviceInfo || 'Eszköz';
      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id: conn.peer,
        deviceInfo: peerDeviceInfo
      });

      try {
        conn.send(JSON.stringify({
          type: 'handshake',
          deviceInfo: this.myDeviceName
        }));
      } catch (e) {}

      this.notifyDevicesUpdate();
    });

    conn.on('data', (data) => {
      this.handleIncomingData(conn.peer, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.onlineDevices.delete(conn.peer);
      this.cleanIncomingState(conn.peer);
      this.notifyDevicesUpdate();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.onlineDevices.delete(conn.peer);
      this.cleanIncomingState(conn.peer);
      this.notifyDevicesUpdate();
    });
  }

  cleanIncomingState(peerId) {
    this.incomingHeaders.delete(peerId);
    this.receivedChunksMap.delete(peerId);
    this.receivedBytesMap.delete(peerId);
    this.receiveStartTimes.delete(peerId);
  }

  notifyDevicesUpdate() {
    const list = [
      { id: this.myId, deviceInfo: this.myDeviceName, isSelf: true },
      ...Array.from(this.onlineDevices.values())
    ];
    if (this.onDevicesUpdate) this.onDevicesUpdate(list);
  }

  // Pure WebRTC DataChannel message parser
  handleIncomingData(fromPeerId, data) {
    // 1. Text JSON Control Packets (Header, Handshake, End)
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'handshake') {
          this.onlineDevices.set(fromPeerId, {
            id: fromPeerId,
            deviceInfo: msg.deviceInfo || 'Eszköz'
          });
          this.notifyDevicesUpdate();
          return;
        }

        if (msg.type === 'header') {
          this.incomingHeaders.set(fromPeerId, msg);
          this.receivedChunksMap.set(fromPeerId, []);
          this.receivedBytesMap.set(fromPeerId, 0);
          this.receiveStartTimes.set(fromPeerId, Date.now());
          return;
        }

        if (msg.type === 'end') {
          const header = this.incomingHeaders.get(fromPeerId);
          const chunks = this.receivedChunksMap.get(fromPeerId) || [];

          if (header && chunks.length > 0) {
            const blob = new Blob(chunks, { type: header.mimeType });
            const file = new File([blob], header.name, { type: header.mimeType });

            if (this.onFileReceived) {
              this.onFileReceived({
                file,
                blobUrl: URL.createObjectURL(blob),
                name: header.name,
                size: header.size,
                mimeType: header.mimeType,
                fromPeerId
              });
            }
          }

          this.cleanIncomingState(fromPeerId);
          return;
        }
      } catch (err) {
        console.error('JSON parsing error:', err);
      }
    } 
    // 2. Direct Raw Binary ArrayBuffer Chunks
    else if (data instanceof ArrayBuffer || data?.buffer instanceof ArrayBuffer) {
      const buffer = data instanceof ArrayBuffer ? data : data.buffer;
      const header = this.incomingHeaders.get(fromPeerId);
      if (!header) return;

      const chunks = this.receivedChunksMap.get(fromPeerId) || [];
      chunks.push(buffer);
      this.receivedChunksMap.set(fromPeerId, chunks);

      const currentBytes = (this.receivedBytesMap.get(fromPeerId) || 0) + buffer.byteLength;
      this.receivedBytesMap.set(fromPeerId, currentBytes);

      const startTime = this.receiveStartTimes.get(fromPeerId) || Date.now();
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

  // Send files to specific peer
  async sendFilesToPeer(targetPeerId, fileList) {
    const conn = this.connections.get(targetPeerId);
    if (!conn || !conn.open) {
      console.error(`Connection to ${targetPeerId} is not open`);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      await this.sendFileToConn(conn, file, i + 1, fileList.length);
    }
  }

  // Send files to all online peers
  async sendFilesToAll(fileList) {
    const activePeers = Array.from(this.connections.keys());
    for (const peerId of activePeers) {
      await this.sendFilesToPeer(peerId, fileList);
    }
  }

  async sendFileToConn(conn, file, currentIndex, totalFiles) {
    return new Promise((resolve) => {
      // 1. Send JSON Header Control Packet
      conn.send(JSON.stringify({
        type: 'header',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        currentIndex,
        totalFiles
      }));

      let offset = 0;
      const startTime = Date.now();
      const reader = new FileReader();

      const sendNextChunk = () => {
        if (offset >= file.size) {
          // 3. Send JSON End Control Packet
          conn.send(JSON.stringify({ type: 'end', name: file.name }));
          resolve();
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (!conn || !conn.open) {
          resolve();
          return;
        }

        const chunkBuffer = e.target.result;
        // 2. Send Raw Binary ArrayBuffer Chunk directly over DataChannel
        conn.send(chunkBuffer);

        offset += chunkBuffer.byteLength;

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

        // Backpressure check or slight 2ms throttle
        setTimeout(sendNextChunk, 2);
      };

      sendNextChunk();
    });
  }

  destroy() {
    this.isDestroyed = true;
    if (this.probeTimer) clearInterval(this.probeTimer);
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.connections.clear();
    this.onlineDevices.clear();
    this.incomingHeaders.clear();
    this.receivedChunksMap.clear();
    this.receivedBytesMap.clear();
    this.receiveStartTimes.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
