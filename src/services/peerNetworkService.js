import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';

const CHUNK_SIZE = 64 * 1024; // 64KB raw binary WebRTC chunks
const MAX_SLOTS = 10;
const SLOT_PREFIX = 'airdrop-p2p-v5-';

class PeerNetworkService {
  constructor() {
    this.peer = null;
    this.myId = null;
    this.mySlotIndex = null;
    this.myDeviceName = detectDeviceName();

    this.connections = new Map();
    this.onlineDevices = new Map();

    // Callbacks
    this.onStatusChange = null;
    this.onDevicesUpdate = null;
    this.onProgress = null;
    this.onFileReceived = null;
    this.onIncomingPrompt = null;
    this.onRejected = null;
    this.onCancelled = null;

    // Incoming file assembly states per sender
    this.incomingHeaders = new Map();
    this.receivedChunksMap = new Map();
    this.receivedBytesMap = new Map();
    this.receiveStartTimes = new Map();
    this.pendingTransferFiles = new Map();
    this.activeSendCancellations = new Map();

    this.probeTimer = null;
    this.isDestroyed = false;

    // Fast reconnect when user switches back to app tab
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.probeOtherSlots();
        }
      });
    }
  }

  init(onStatusChange, onDevicesUpdate, onProgress, onFileReceived, onIncomingPrompt, onRejected, onCancelled) {
    this.onStatusChange = onStatusChange;
    this.onDevicesUpdate = onDevicesUpdate;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
    this.onIncomingPrompt = onIncomingPrompt;
    this.onRejected = onRejected;
    this.onCancelled = onCancelled;
    this.isDestroyed = false;

    this.tryClaimSlot(1);
  }

  updateMyDeviceName(newName) {
    if (!newName || !newName.trim()) return;
    this.myDeviceName = newName.trim();
    localStorage.setItem('airdrop_custom_device_name', this.myDeviceName);

    // Broadcast updated name to all connected peers
    this.connections.forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send(JSON.stringify({
            type: 'handshake',
            deviceInfo: this.myDeviceName,
            deviceType: this.myDeviceName
          }));
        } catch (e) {}
      }
    });

    this.notifyDevicesUpdate();
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

        // Instant discovery probe
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
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = setInterval(() => {
      this.probeOtherSlots();
    }, 2000);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;

      const targetSlotId = `${SLOT_PREFIX}${i}`;
      const existingConn = this.connections.get(targetSlotId);

      // Clean up stale or closed connections
      if (existingConn && !existingConn.open) {
        this.connections.delete(targetSlotId);
        this.onlineDevices.delete(targetSlotId);
      }

      if (!existingConn || !existingConn.open) {
        this.connectToSlot(targetSlotId);
      }
    }

    this.notifyDevicesUpdate();
  }

  connectToSlot(targetSlotId) {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    try {
      const conn = this.peer.connect(targetSlotId, {
        metadata: { deviceInfo: this.myDeviceName, deviceType: this.myDeviceName },
        reliable: true
      });

      this.setupConnectionEvents(conn);
    } catch (err) {}
  }

  handleIncomingConnection(conn) {
    this.setupConnectionEvents(conn);
  }

  setupConnectionEvents(conn) {
    const handleOpen = () => {
      console.log(`🤝 Connected with ${conn.peer}`);
      
      const peerDeviceInfo = conn.metadata?.deviceInfo || conn.metadata?.deviceType || 'Eszköz';
      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id: conn.peer,
        deviceInfo: peerDeviceInfo,
        deviceType: peerDeviceInfo,
        name: peerDeviceInfo
      });

      try {
        conn.send(JSON.stringify({
          type: 'handshake',
          deviceInfo: this.myDeviceName,
          deviceType: this.myDeviceName
        }));
      } catch (e) {}

      this.notifyDevicesUpdate();
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

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
    this.pendingTransferFiles.delete(peerId);
    this.activeSendCancellations.delete(peerId);
  }

  notifyDevicesUpdate() {
    const list = [
      { id: this.myId, deviceInfo: this.myDeviceName, deviceType: this.myDeviceName, name: this.myDeviceName, isSelf: true },
      ...Array.from(this.onlineDevices.values()).map(p => ({
        ...p,
        deviceType: p.deviceType || p.deviceInfo || p.name || 'Eszköz',
        deviceInfo: p.deviceType || p.deviceInfo || p.name || 'Eszköz',
        name: p.deviceType || p.deviceInfo || p.name || 'Eszköz'
      }))
    ];
    if (this.onDevicesUpdate) this.onDevicesUpdate(list);
  }

  // Handle WebRTC DataChannel message parser (Clean, Pure, Unblocked)
  handleIncomingData(fromPeerId, data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'handshake') {
          const peerName = msg.deviceType || msg.deviceInfo || 'Eszköz';
          this.onlineDevices.set(fromPeerId, {
            id: fromPeerId,
            deviceInfo: peerName,
            deviceType: peerName,
            name: peerName
          });
          this.notifyDevicesUpdate();
          return;
        }

        // Sender proposed transfer header -> Trigger prompt immediately!
        if (msg.type === 'propose_transfer') {
          const senderInfo = this.onlineDevices.get(fromPeerId);
          const senderName = senderInfo?.deviceType || senderInfo?.deviceInfo || 'Online Eszköz';
          if (this.onIncomingPrompt) {
            this.onIncomingPrompt({
              transferId: msg.transferId || Date.now(),
              fromPeerId,
              senderName,
              totalFiles: msg.totalFiles,
              fileName: msg.fileName,
              fileNames: msg.fileNames || [msg.fileName]
            });
          }
          return;
        }

        // Sender cancelled proposed transfer -> Unmount prompt immediately!
        if (msg.type === 'cancel_proposed_transfer') {
          if (this.onCancelled) this.onCancelled(fromPeerId);
          return;
        }

        // Receiver accepted transfer -> start streaming!
        if (msg.type === 'accept_transfer') {
          const pending = this.pendingTransferFiles.get(fromPeerId);
          if (pending) {
            this.executeSendFiles(fromPeerId, pending);
            this.pendingTransferFiles.delete(fromPeerId);
          }
          return;
        }

        // Receiver rejected transfer -> cancel sending!
        if (msg.type === 'reject_transfer') {
          this.pendingTransferFiles.delete(fromPeerId);
          this.activeSendCancellations.set(fromPeerId, true);
          if (this.onRejected) this.onRejected(fromPeerId);
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
                currentIndex: header.currentIndex || 1,
                totalFiles: header.totalFiles || 1,
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

  // Accept incoming transfer prompt
  acceptIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn && conn.open) {
      conn.send(JSON.stringify({ type: 'accept_transfer' }));
    }
  }

  // Reject incoming transfer prompt
  rejectIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn && conn.open) {
      conn.send(JSON.stringify({ type: 'reject_transfer' }));
    }
  }

  // Cancel proposed transfer (Clean, Instant, Single payload)
  cancelProposedSend(targetPeerId) {
    this.pendingTransferFiles.delete(targetPeerId);
    this.activeSendCancellations.set(targetPeerId, true);

    const conn = this.connections.get(targetPeerId);
    if (conn && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'cancel_proposed_transfer' }));
      } catch (e) {}
    }
  }

  // Propose transfer to target peer (Clean, Instant, Single payload)
  sendFilesToPeer(targetPeerId, fileList) {
    const conn = this.connections.get(targetPeerId);
    if (!conn || !conn.open) {
      console.warn('Connection not open to target peer:', targetPeerId);
      if (this.onRejected) this.onRejected(targetPeerId);
      return;
    }

    this.pendingTransferFiles.set(targetPeerId, fileList);
    this.activeSendCancellations.delete(targetPeerId);

    try {
      conn.send(JSON.stringify({
        type: 'propose_transfer',
        transferId: Date.now(),
        totalFiles: fileList.length,
        fileName: fileList[0]?.name || 'Fájl',
        fileNames: Array.from(fileList).map((f) => f.name)
      }));
    } catch (err) {
      console.error('Error sending propose_transfer:', err);
    }
  }

  sendFilesToAll(fileList) {
    const activePeers = Array.from(this.connections.keys());
    for (const peerId of activePeers) {
      this.sendFilesToPeer(peerId, fileList);
    }
  }

  async executeSendFiles(targetPeerId, fileList) {
    const conn = this.connections.get(targetPeerId);
    if (!conn || !conn.open) return;

    for (let i = 0; i < fileList.length; i++) {
      if (this.activeSendCancellations.get(targetPeerId)) break;

      const file = fileList[i];
      await this.sendFileToConn(conn, file, i + 1, fileList.length);
    }
  }

  async sendFileToConn(conn, file, currentIndex, totalFiles) {
    return new Promise((resolve) => {
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
        if (offset >= file.size || this.activeSendCancellations.get(conn.peer)) {
          conn.send(JSON.stringify({ type: 'end', name: file.name }));
          resolve();
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (!conn || !conn.open || this.activeSendCancellations.get(conn.peer)) {
          resolve();
          return;
        }

        const chunkBuffer = e.target.result;
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
    this.pendingTransferFiles.clear();
    this.activeSendCancellations.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
