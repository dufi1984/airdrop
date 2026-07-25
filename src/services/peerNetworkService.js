import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';

const CHUNK_SIZE = 32 * 1024; // 32KB chunks for high mobile/desktop WebRTC stability
const MAX_SLOTS = 6;
const SLOT_PREFIX = 'airdrop-p2p-v3-';

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

    // Incoming file assembly states per sender
    this.incomingState = new Map();

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
        console.log(`✅ Claimed slot #${slotIndex}:`, id);
        this.peer = peer;
        this.myId = id;
        this.mySlotIndex = slotIndex;

        if (this.onStatusChange) this.onStatusChange(true);

        // Listen for incoming P2P connections
        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        // Probe other slots for peers (one-time probe loop without rate limiting)
        this.startProbing();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          peer.destroy();
          this.tryClaimSlot(slotIndex + 1);
        } else {
          console.warn('Peer network warning:', err.type);
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
    // Low frequency probe (every 6 seconds) to prevent rate limits
    this.probeTimer = setInterval(() => {
      this.probeOtherSlots();
    }, 6000);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;

      const targetSlotId = `${SLOT_PREFIX}${i}`;
      // Only connect if not connected already
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
    } catch (err) {
      // Slot not ready yet
    }
  }

  handleIncomingConnection(conn) {
    console.log('👤 Incoming peer connection from:', conn.peer);
    this.setupConnectionEvents(conn);
  }

  setupConnectionEvents(conn) {
    conn.on('open', () => {
      console.log(`🤝 P2P Connected with ${conn.peer}`);
      
      const peerDeviceInfo = conn.metadata?.deviceInfo || 'Eszköz';
      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id: conn.peer,
        deviceInfo: peerDeviceInfo
      });

      // Send handshake
      try {
        conn.send({
          type: 'handshake',
          deviceInfo: this.myDeviceName
        });
      } catch (e) {}

      this.notifyDevicesUpdate();
    });

    conn.on('data', (data) => {
      this.handleDataMessage(conn.peer, data);
    });

    conn.on('close', () => {
      console.log(`🔌 Connection closed with ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.onlineDevices.delete(conn.peer);
      this.incomingState.delete(conn.peer);
      this.notifyDevicesUpdate();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.onlineDevices.delete(conn.peer);
      this.incomingState.delete(conn.peer);
      this.notifyDevicesUpdate();
    });
  }

  notifyDevicesUpdate() {
    const list = [
      { id: this.myId, deviceInfo: this.myDeviceName, isSelf: true },
      ...Array.from(this.onlineDevices.values())
    ];
    if (this.onDevicesUpdate) this.onDevicesUpdate(list);
  }

  // Handle structured data packets safely
  handleDataMessage(fromPeerId, data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'handshake') {
      this.onlineDevices.set(fromPeerId, {
        id: fromPeerId,
        deviceInfo: data.deviceInfo || 'Eszköz'
      });
      this.notifyDevicesUpdate();
      return;
    }

    if (data.type === 'header') {
      this.incomingState.set(fromPeerId, {
        header: data,
        chunks: [],
        receivedBytes: 0,
        startTime: Date.now()
      });
      return;
    }

    if (data.type === 'chunk' && data.chunk) {
      const state = this.incomingState.get(fromPeerId);
      if (!state) return;

      state.chunks.push(data.chunk);
      state.receivedBytes += data.chunk.byteLength || data.chunk.size || 0;

      const elapsed = (Date.now() - state.startTime) / 1000;
      const speed = elapsed > 0 ? state.receivedBytes / elapsed : 0;
      const remainingBytes = state.header.size - state.receivedBytes;
      const eta = speed > 0 ? remainingBytes / speed : 0;
      const progress = Math.min(100, Math.round((state.receivedBytes / state.header.size) * 100));

      if (this.onProgress) {
        this.onProgress({
          direction: 'receive',
          fileName: state.header.name,
          fileSize: state.header.size,
          progress,
          speed,
          eta,
          currentIndex: state.header.currentIndex,
          totalFiles: state.header.totalFiles
        });
      }
      return;
    }

    if (data.type === 'end') {
      const state = this.incomingState.get(fromPeerId);
      if (state && state.header) {
        const blob = new Blob(state.chunks, { type: state.header.mimeType });
        const file = new File([blob], state.header.name, { type: state.header.mimeType });

        if (this.onFileReceived) {
          this.onFileReceived({
            file,
            blobUrl: URL.createObjectURL(blob),
            name: state.header.name,
            size: state.header.size,
            mimeType: state.header.mimeType,
            fromPeerId
          });
        }
      }
      this.incomingState.delete(fromPeerId);
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
      // 1. Send Header
      conn.send({
        type: 'header',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        currentIndex,
        totalFiles
      });

      let offset = 0;
      const startTime = Date.now();
      const reader = new FileReader();

      const sendNextChunk = () => {
        if (offset >= file.size) {
          // 3. Send End Packet
          conn.send({ type: 'end', name: file.name });
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
        // 2. Send Chunk Packet with structured payload
        conn.send({
          type: 'chunk',
          chunk: chunkBuffer
        });

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

        // Smooth 5ms throttle to prevent buffer overload on mobile/desktop Chrome
        setTimeout(sendNextChunk, 5);
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
    this.incomingState.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
