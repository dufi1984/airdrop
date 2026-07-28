import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';

const CHUNK_SIZE = 64 * 1024; // 64KB raw binary WebRTC chunks
const MAX_SLOTS = 6;
const SLOT_PREFIX = 'airdrop-p2p-v5-';

/**
 * Clean Single-Responsibility WebRTC Peer-to-Peer Transfer Engine
 */
class PeerNetworkService {
  constructor() {
    this.peer = null;
    this.myId = null;
    this.mySlotIndex = null;
    this.myDeviceName = detectDeviceName();

    // Active DataChannel connections per target peer ID
    this.connections = new Map();
    // Known online devices on the network
    this.onlineDevices = new Map();

    // Sender Sessions: targetPeerId => { files: File[], status: 'PROPOSED' | 'STREAMING' }
    this.senderSessions = new Map();

    // Receiver Sessions: senderPeerId => { transferId, senderName, totalFiles, header, chunks: ArrayBuffer[], receivedBytes: number }
    this.receiverSessions = new Map();

    // Event Callbacks
    this.onStatusChange = null;
    this.onDevicesUpdate = null;
    this.onProgress = null;
    this.onFileReceived = null;
    this.onIncomingPrompt = null;
    this.onRejected = null;
    this.onCancelled = null;

    this.probeTimer = null;
    this.isDestroyed = false;
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
        this.peer = peer;
        this.myId = id;
        this.mySlotIndex = slotIndex;

        if (this.onStatusChange) this.onStatusChange(true);

        this.peer.on('connection', (conn) => {
          this.setupConnectionEvents(conn);
        });

        this.startProbing();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          peer.destroy();
          this.tryClaimSlot(slotIndex + 1);
        } else {
          console.warn('[PeerJS] Init notice:', err.type);
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
      console.error('[PeerJS] Init Exception:', e);
    }
  }

  startProbing() {
    this.probeOtherSlots();
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = setInterval(() => {
      this.probeOtherSlots();
    }, 4000);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;

      const targetSlotId = `${SLOT_PREFIX}${i}`;
      const existingConn = this.connections.get(targetSlotId);
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

  setupConnectionEvents(conn) {
    conn.on('open', () => {
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
    });

    conn.on('data', (data) => {
      this.handleIncomingData(conn.peer, data);
    });

    conn.on('close', () => {
      this.cleanupPeerSession(conn.peer);
    });

    conn.on('error', () => {
      this.cleanupPeerSession(conn.peer);
    });
  }

  cleanupPeerSession(peerId) {
    this.connections.delete(peerId);
    this.onlineDevices.delete(peerId);
    this.senderSessions.delete(peerId);
    this.receiverSessions.delete(peerId);
    this.notifyDevicesUpdate();
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

  // --- Centralized WebRTC Data Message Handler ---
  handleIncomingData(fromPeerId, data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        // 1. Handshake Message
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

        // 2. Incoming Transfer Proposal from Sender
        if (msg.type === 'propose_transfer') {
          const senderInfo = this.onlineDevices.get(fromPeerId);
          const senderName = msg.senderName || senderInfo?.deviceType || 'Online Eszköz';

          // Initialize clean receiver session state
          this.receiverSessions.set(fromPeerId, {
            transferId: msg.transferId || Date.now(),
            senderName,
            totalFiles: msg.totalFiles,
            fileNames: msg.fileNames || [msg.fileName],
            chunks: [],
            receivedBytes: 0,
            header: null,
            startTime: null
          });

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

        // 3. Sender Cancelled Proposed Transfer
        if (msg.type === 'cancel_proposed_transfer') {
          this.receiverSessions.delete(fromPeerId);
          if (this.onCancelled) this.onCancelled(fromPeerId);
          return;
        }

        // 4. Receiver Accepted Transfer -> Sender starts streaming!
        if (msg.type === 'accept_transfer') {
          const session = this.senderSessions.get(fromPeerId);
          if (session && session.files) {
            session.status = 'STREAMING';
            this.executeSendFiles(fromPeerId, session.files);
          }
          return;
        }

        // 5. Receiver Rejected Transfer -> Sender stops session
        if (msg.type === 'reject_transfer') {
          this.senderSessions.delete(fromPeerId);
          if (this.onRejected) this.onRejected(fromPeerId);
          return;
        }

        // 6. Incoming File Header
        if (msg.type === 'header') {
          const session = this.receiverSessions.get(fromPeerId) || {};
          session.header = msg;
          session.chunks = [];
          session.receivedBytes = 0;
          session.startTime = Date.now();
          this.receiverSessions.set(fromPeerId, session);
          return;
        }

        // 7. Incoming File End Signal
        if (msg.type === 'end') {
          const session = this.receiverSessions.get(fromPeerId);
          if (session && session.header && session.chunks.length > 0) {
            const blob = new Blob(session.chunks, { type: session.header.mimeType });
            const file = new File([blob], session.header.name, { type: session.header.mimeType });

            if (this.onFileReceived) {
              this.onFileReceived({
                file,
                blobUrl: URL.createObjectURL(blob),
                name: session.header.name,
                size: session.header.size,
                mimeType: session.header.mimeType,
                currentIndex: session.header.currentIndex || 1,
                totalFiles: session.header.totalFiles || 1,
                fromPeerId
              });
            }
          }

          // Clean session if this was the final file
          if (session?.header?.currentIndex >= session?.header?.totalFiles) {
            this.receiverSessions.delete(fromPeerId);
          }
          return;
        }
      } catch (err) {
        console.error('[PeerJS] JSON Message Error:', err);
      }
    } 
    else if (data instanceof ArrayBuffer || data?.buffer instanceof ArrayBuffer) {
      // 8. Raw Binary WebRTC Chunk Stream
      const buffer = data instanceof ArrayBuffer ? data : data.buffer;
      const session = this.receiverSessions.get(fromPeerId);
      if (!session || !session.header) return;

      session.chunks.push(buffer);
      session.receivedBytes += buffer.byteLength;

      const elapsed = (Date.now() - (session.startTime || Date.now())) / 1000;
      const speed = elapsed > 0 ? session.receivedBytes / elapsed : 0;
      const remainingBytes = session.header.size - session.receivedBytes;
      const eta = speed > 0 ? remainingBytes / speed : 0;
      const progress = Math.min(100, Math.round((session.receivedBytes / session.header.size) * 100));

      if (this.onProgress) {
        this.onProgress({
          direction: 'receive',
          fileName: session.header.name,
          fileSize: session.header.size,
          progress,
          speed,
          eta,
          currentIndex: session.header.currentIndex,
          totalFiles: session.header.totalFiles
        });
      }
    }
  }

  // --- Receiver Actions ---

  acceptIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'accept_transfer' }));
      } catch (e) {}
    }
  }

  rejectIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'reject_transfer' }));
      } catch (e) {}
    }
    this.receiverSessions.delete(fromPeerId);
  }

  // --- Sender Actions ---

  cancelProposedSend(targetPeerId) {
    const conn = this.connections.get(targetPeerId);
    if (conn && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'cancel_proposed_transfer' }));
      } catch (e) {}
    }
    this.senderSessions.delete(targetPeerId);
  }

  async sendFilesToPeer(targetPeerId, fileList) {
    if (!fileList || fileList.length === 0) return;

    // Register clean sender session
    this.senderSessions.set(targetPeerId, {
      files: Array.from(fileList),
      status: 'PROPOSED'
    });

    const safeFileNames = Array.from(fileList).slice(0, 10).map((f) => f.name);
    const payload = JSON.stringify({
      type: 'propose_transfer',
      transferId: Date.now() + Math.random(),
      senderName: this.myDeviceName,
      totalFiles: fileList.length,
      fileName: fileList[0]?.name || 'Fájl',
      fileNames: safeFileNames
    });

    let conn = this.connections.get(targetPeerId);
    let sentSuccessfully = false;

    // 1. Send over existing open channel
    if (conn && conn.open) {
      try {
        conn.send(payload);
        sentSuccessfully = true;
      } catch (err) {
        this.connections.delete(targetPeerId);
      }
    }

    // 2. If channel was closed or failed, establish fresh channel and send
    if (!sentSuccessfully) {
      this.connectToSlot(targetPeerId);
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        conn = this.connections.get(targetPeerId);
        if (conn && conn.open) {
          try {
            conn.send(payload);
            sentSuccessfully = true;
            break;
          } catch (e) {}
        }
      }
    }
  }

  async sendFilesToAll(fileList) {
    const activePeers = Array.from(this.connections.keys());
    for (const peerId of activePeers) {
      await this.sendFilesToPeer(peerId, fileList);
    }
  }

  async executeSendFiles(targetPeerId, fileList) {
    const conn = this.connections.get(targetPeerId);
    if (!conn || !conn.open) return;

    for (let i = 0; i < fileList.length; i++) {
      const session = this.senderSessions.get(targetPeerId);
      if (!session || session.status !== 'STREAMING') break;

      const file = fileList[i];
      await this.sendFileToConn(conn, file, i + 1, fileList.length);
    }

    this.senderSessions.delete(targetPeerId);
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
        const session = this.senderSessions.get(conn.peer);
        if (offset >= file.size || !session || session.status !== 'STREAMING') {
          try {
            conn.send(JSON.stringify({ type: 'end', name: file.name }));
          } catch (e) {}
          resolve();
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        const session = this.senderSessions.get(conn.peer);
        if (!conn || !conn.open || !session || session.status !== 'STREAMING') {
          resolve();
          return;
        }

        const chunkBuffer = e.target.result;
        try {
          conn.send(chunkBuffer);
        } catch (err) {
          resolve();
          return;
        }

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
    this.senderSessions.clear();
    this.receiverSessions.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
