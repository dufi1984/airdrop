import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';
import { platform } from '../platform';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────
// Transfer Constants & WebRTC / TURN Config
// ─────────────────────────────────────────────
const HIGH_WATERMARK    = 256 * 1024;
const LOW_WATERMARK     = 32 * 1024;
const CHUNK_WATCHDOG_MS = 45_000; // 45s adaptive watchdog for mobile network jitter
const HEARTBEAT_MS      = 3_000;  // 3s keepalive ping for mobile NAT retention
const MAX_SLOTS         = 10;
const PROTOCOL_VERSION  = 'v6';

/**
 * Public STUN + High-Availability OpenRelay TURN servers
 * Provides UDP, TCP, and TLS/TURNS relays for 100% traversal of
 * 4G/5G Carrier-Grade NAT (CGNAT) and Symmetric NAT.
 */
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 6,
};

/**
 * Returns the ideal chunk size for a given receiver peer.
 * iOS WebKit: 16 KB (prevents silent packet drops)
 * Android & Desktop: 64 KB (optimal throughput)
 */
function getChunkSizeFor(receiverFamily) {
  return receiverFamily === 'ios' ? 16 * 1024 : 64 * 1024;
}

// ─────────────────────────────────────────────
// Utility: read a file slice as ArrayBuffer
// ─────────────────────────────────────────────
function readSlice(file, offset, size) {
  return new Promise((resolve, reject) => {
    const slice = file.slice(offset, offset + size);
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(slice);
  });
}

// ─────────────────────────────────────────────
// Utility: safely get the native RTCDataChannel
// ─────────────────────────────────────────────
function getRawDataChannel(conn) {
  return conn?._dc ?? conn?.dataChannel ?? conn?._channel ?? null;
}

// ─────────────────────────────────────────────
// Utility: wait for bufferedamountlow event
// ─────────────────────────────────────────────
function waitForDrain(dc, abortController) {
  return new Promise((resolve, reject) => {
    if (abortController.aborted) { reject(new Error('aborted')); return; }
    if (dc.bufferedAmount <= LOW_WATERMARK) { resolve(); return; }

    const onLow = () => {
      dc.removeEventListener('bufferedamountlow', onLow);
      resolve();
    };
    dc.addEventListener('bufferedamountlow', onLow);

    // Safety fallback: if event never fires on some mobile WebKit builds
    const fallback = setTimeout(() => {
      dc.removeEventListener('bufferedamountlow', onLow);
      resolve();
    }, 400);

    const abortCheck = setInterval(() => {
      if (abortController.aborted) {
        clearInterval(abortCheck);
        clearTimeout(fallback);
        dc.removeEventListener('bufferedamountlow', onLow);
        reject(new Error('aborted'));
      }
    }, 100);
  });
}

// ═════════════════════════════════════════════
// PeerNetworkService
// ═════════════════════════════════════════════
class PeerNetworkService {
  constructor() {
    this.peer           = null;
    this.myId           = null;
    this.mySlotIndex    = null;
    this.myDeviceName   = detectDeviceName();
    this.roomId         = this.resolveRoomId();

    this.connections      = new Map(); // peerId → PeerJS DataConnection
    this.onlineDevices    = new Map(); // peerId → { id, name, deviceInfo, deviceType, deviceFamily }
    this.senderSessions   = new Map(); // peerId → SenderSession
    this.receiverSessions = new Map(); // peerId → ReceiverSession

    // Callbacks
    this.onStatusChange    = null;
    this.onDevicesUpdate   = null;
    this.onProgress        = null;
    this.onFileReceived    = null;
    this.onIncomingPrompt  = null;
    this.onRejected        = null;
    this.onCancelled       = null;
    this.onTransferAborted = null;

    this.probeTimer      = null;
    this.heartbeatTimer  = null;
    this.wakeLockSentinel = null;
    this.isDestroyed     = false;

    this.setupLifecycleListeners();
  }

  // ─────────────────────────────────────────
  // Room Resolution
  // ─────────────────────────────────────────
  resolveRoomId() {
    if (typeof window === 'undefined') return 'public';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRoom = urlParams.get('room');
      if (queryRoom) return queryRoom.toLowerCase();

      const hash = window.location.hash;
      if (hash.includes('room=')) {
        const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return match[1].toLowerCase();
      }
      if (hash.startsWith('#') && hash.length > 1 && !hash.includes('/')) {
        return hash.substring(1).toLowerCase();
      }
    } catch (_) {}
    return 'lobby';
  }

  getRoomUrl() {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}#room=${this.roomId}`;
  }

  getSlotPrefix() {
    return `airdrop-${PROTOCOL_VERSION}-${this.roomId}-`;
  }

  // ─────────────────────────────────────────
  // Public: init
  // ─────────────────────────────────────────
  init(onStatusChange, onDevicesUpdate, onProgress, onFileReceived,
       onIncomingPrompt, onRejected, onCancelled, onTransferAborted) {
    this.onStatusChange    = onStatusChange;
    this.onDevicesUpdate   = onDevicesUpdate;
    this.onProgress        = onProgress;
    this.onFileReceived    = onFileReceived;
    this.onIncomingPrompt  = onIncomingPrompt;
    this.onRejected        = onRejected;
    this.onCancelled       = onCancelled;
    this.onTransferAborted = onTransferAborted;
    this.isDestroyed       = false;

    logger.info('SYSTEM', `Airdrop inicializálása [Szoba: ${this.roomId}, Eszköz: ${this.myDeviceName}]`);
    this.tryClaimSlot(1);
    this.startHeartbeats();
  }

  // ─────────────────────────────────────────
  // PeerJS Connection & Slot Claiming
  // ─────────────────────────────────────────
  tryClaimSlot(slotIndex) {
    if (this.isDestroyed) return;

    // If all primary slots are taken, use a unique random ID in this room
    let slotId;
    if (slotIndex <= MAX_SLOTS) {
      slotId = `${this.getSlotPrefix()}${slotIndex}`;
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      slotId = `${this.getSlotPrefix()}extra-${randomSuffix}`;
    }

    logger.info('PEER', `Csatlakozás a PeerJS felhőhöz... (${slotId})`);

    try {
      const peer = new Peer(slotId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 1,
        config: RTC_CONFIG,
      });

      peer.on('open', (id) => {
        if (this.isDestroyed) { peer.destroy(); return; }
        this.peer = peer;
        this.myId = id;
        this.mySlotIndex = slotIndex <= MAX_SLOTS ? slotIndex : 999;
        logger.success('PEER', `Sikeres regisztráció a felhőben! ID: ${id}`);

        if (this.onStatusChange) this.onStatusChange(true);

        this.peer.on('connection', (conn) => {
          logger.info('PEER', `Bejövő kapcsolat észlelve: ${conn.peer}`);
          this.setupConnectionEvents(conn);
        });

        this.startProbing();
        this.checkDirectUrlConnect();
      });

      peer.on('error', (err) => {
        logger.warn('PEER', `PeerJS esemény (${err.type}): ${err.message}`);
        if (err.type === 'unavailable-id') {
          peer.destroy();
          if (slotIndex <= MAX_SLOTS) {
            this.tryClaimSlot(slotIndex + 1);
          } else {
            // Retry with a new random ID
            setTimeout(() => this.tryClaimSlot(MAX_SLOTS + 1), 1000);
          }
        } else if (err.type === 'network' || err.type === 'peer-unavailable') {
          // Expected during slot probing
        } else {
          logger.error('PEER', `Kritikus Peer hiba [${err.type}]: ${err.message}`);
        }
      });

      peer.on('disconnected', () => {
        logger.warn('PEER', 'PeerJS kapcsolat megszakadt a felhővel – automatikus újracsatlakozás...');
        if (this.onStatusChange) this.onStatusChange(false);
        if (this.peer && !this.peer.destroyed && !this.isDestroyed) {
          setTimeout(() => {
            try { this.peer.reconnect(); } catch (_) {}
          }, 1500);
        }
      });

      peer.on('close', () => {
        logger.warn('PEER', 'Peer kapcsolat lezárult.');
        if (this.onStatusChange) this.onStatusChange(false);
      });
    } catch (e) {
      logger.error('PEER', `Kivétel a Peer indításakor: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────
  // Direct URL Pairing (e.g. from QR scan)
  // ─────────────────────────────────────────
  checkDirectUrlConnect() {
    try {
      const hash = window.location.hash;
      if (hash.includes('connect=')) {
        const match = hash.match(/connect=([a-zA-Z0-9_-]+)/);
        if (match && match[1] && match[1] !== this.myId) {
          const targetPeer = match[1];
          logger.info('PEER', `Közvetlen QR párosítás célpont felé: ${targetPeer}`);
          this.connectToPeerId(targetPeer);
        }
      }
    } catch (_) {}
  }

  // ─────────────────────────────────────────
  // Device Discovery / Probing
  // ─────────────────────────────────────────
  startProbing() {
    this.probeOtherSlots();
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = setInterval(() => this.probeOtherSlots(), 2500);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;
      const targetId = `${this.getSlotPrefix()}${i}`;

      const existing = this.connections.get(targetId);
      if (!existing || !existing.open) {
        this.connectToPeerId(targetId);
      }
    }
    this.notifyDevicesUpdate();
  }

  connectToPeerId(targetId) {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;
    if (targetId === this.myId) return;

    const existing = this.connections.get(targetId);
    if (existing && existing.open) return;

    try {
      const conn = this.peer.connect(targetId, {
        metadata: {
          deviceInfo:   this.myDeviceName,
          deviceType:   this.myDeviceName,
          deviceFamily: platform.name,
        },
        reliable: true,
      });
      this.setupConnectionEvents(conn);
    } catch (e) {
      logger.warn('PEER', `Hiba a kapcsolódáskor (${targetId}): ${e.message}`);
    }
  }

  // ─────────────────────────────────────────
  // Connection Lifecycle & ICE Monitoring
  // ─────────────────────────────────────────
  setupConnectionEvents(conn) {
    if (!conn) return;

    // Attach ICE connection state monitoring if available
    const pc = conn.peerConnection;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logger.ice(`ICE kapcsolat állapot [${conn.peer}]: ${state}`);
        if (state === 'failed' || state === 'disconnected') {
          logger.warn('ICE', `ICE megszakadt (${conn.peer}). Újrakapcsolódás kísérlete...`);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const type = event.candidate.type || 'ismeretlen';
          const proto = event.candidate.protocol || 'udp';
          logger.ice(`ICE jelölt találva [${type.toUpperCase()} / ${proto.toUpperCase()}] (${conn.peer})`);
        }
      };
    }

    conn.on('open', () => {
      const peerName   = conn.metadata?.deviceInfo || conn.metadata?.deviceType || 'Online Eszköz';
      const peerFamily = conn.metadata?.deviceFamily || 'desktop';

      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id: conn.peer,
        name: peerName,
        deviceInfo: peerName,
        deviceType: peerName,
        deviceFamily: peerFamily,
      });

      logger.success('PEER', `Kapcsolat létrejött: ${peerName} (${conn.peer})`);

      // Configure native DataChannel for event-driven backpressure
      const dc = getRawDataChannel(conn);
      if (dc) {
        dc.bufferedAmountLowThreshold = LOW_WATERMARK;
      }

      try {
        conn.send(JSON.stringify({
          type:         'handshake',
          deviceInfo:   this.myDeviceName,
          deviceType:   this.myDeviceName,
          deviceFamily: platform.name,
        }));
      } catch (_) {}

      this.notifyDevicesUpdate();
    });

    conn.on('data', (data) => this.handleIncomingData(conn.peer, data));

    conn.on('close', () => {
      logger.info('PEER', `Kapcsolat lezárult: ${conn.peer}`);
      this.cleanupPeerSession(conn.peer, 'A kapcsolat lezárult.');
    });

    conn.on('error', (err) => {
      logger.error('PEER', `Adatcsatorna hiba (${conn.peer}): ${err.message || err}`);
      this.cleanupPeerSession(conn.peer, `Hiba történt: ${err.message || err}`);
    });
  }

  cleanupPeerSession(peerId, reason = '') {
    const hadActiveSender   = this.senderSessions.has(peerId);
    const hadActiveReceiver = this.receiverSessions.has(peerId);

    // Abort active sender transfer
    const senderSession = this.senderSessions.get(peerId);
    if (senderSession) {
      senderSession.abortController.aborted = true;
    }

    // Clear receiver watchdog
    const receiverSession = this.receiverSessions.get(peerId);
    if (receiverSession?.watchdogTimer) {
      clearTimeout(receiverSession.watchdogTimer);
    }

    this.connections.delete(peerId);
    this.onlineDevices.delete(peerId);
    this.senderSessions.delete(peerId);
    this.receiverSessions.delete(peerId);

    this.releaseWakeLock();

    if ((hadActiveSender || hadActiveReceiver) && this.onTransferAborted) {
      logger.warn('TRANSFER', `Átvitel megszakadt (${peerId}). Ok: ${reason}`);
      this.onTransferAborted(peerId);
    }

    this.notifyDevicesUpdate();
  }

  notifyDevicesUpdate() {
    const self = {
      id: this.myId,
      name: this.myDeviceName,
      deviceInfo: this.myDeviceName,
      deviceType: this.myDeviceName,
      isSelf: true,
    };

    const peers = Array.from(this.onlineDevices.values()).map((p) => ({
      ...p,
      name:       p.name       || p.deviceInfo || 'Eszköz',
      deviceInfo: p.deviceInfo || p.name       || 'Eszköz',
      deviceType: p.deviceType || p.name       || 'Eszköz',
    }));

    if (this.onDevicesUpdate) {
      this.onDevicesUpdate([self, ...peers]);
    }
  }

  // ─────────────────────────────────────────
  // Heartbeat / Keepalive Loop
  // ─────────────────────────────────────────
  startHeartbeats() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      const pingPayload = JSON.stringify({ type: 'ping', time: Date.now() });

      this.connections.forEach((conn, peerId) => {
        if (conn?.open) {
          try {
            conn.send(pingPayload);
          } catch (_) {
            this.cleanupPeerSession(peerId, 'Heartbeat hiba');
          }
        }
      });
    }, HEARTBEAT_MS);
  }

  // ─────────────────────────────────────────
  // Central Message Router
  // ─────────────────────────────────────────
  handleIncomingData(fromPeerId, data) {
    // ── Binary chunk ──────────────────────
    if (data instanceof ArrayBuffer || data?.buffer instanceof ArrayBuffer) {
      this.handleIncomingChunk(fromPeerId, data instanceof ArrayBuffer ? data : data.buffer);
      return;
    }

    // ── JSON control message ──────────────
    if (typeof data !== 'string') return;
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'ping':
        this.onPing(fromPeerId);
        return;
      case 'pong':
        return; // Connection is alive
      case 'handshake':
        return this.onHandshake(fromPeerId, msg);
      case 'propose_transfer':
        return this.onProposeTransfer(fromPeerId, msg);
      case 'cancel_proposed_transfer':
        return this.onCancelProposedTransfer(fromPeerId);
      case 'accept_transfer':
        return this.onAcceptTransfer(fromPeerId);
      case 'reject_transfer':
        return this.onRejectTransfer(fromPeerId);
      case 'header':
        return this.onFileHeader(fromPeerId, msg);
      case 'end':
        return this.onFileEnd(fromPeerId, msg);
      default:
        logger.warn('PEER', `Ismeretlen üzenettípus: ${msg.type}`);
    }
  }

  onPing(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn?.open) {
      try { conn.send(JSON.stringify({ type: 'pong' })); } catch (_) {}
    }
  }

  // ─────────────────────────────────────────
  // Receiver Message Handlers
  // ─────────────────────────────────────────
  onHandshake(fromPeerId, msg) {
    const peerName   = msg.deviceType || msg.deviceInfo || 'Eszköz';
    const peerFamily = msg.deviceFamily || 'desktop';

    this.onlineDevices.set(fromPeerId, {
      id: fromPeerId,
      name: peerName,
      deviceInfo: peerName,
      deviceType: peerName,
      deviceFamily: peerFamily,
    });
    this.notifyDevicesUpdate();
  }

  onProposeTransfer(fromPeerId, msg) {
    const senderInfo = this.onlineDevices.get(fromPeerId);
    const senderName = msg.senderName || senderInfo?.name || 'Online Eszköz';

    logger.info('TRANSFER', `Bejövő fájlcsomag kérés érkezett: ${msg.totalFiles} db fájl (${senderName})`);

    const session = {
      transferId: msg.transferId || Date.now(),
      senderName,
      totalFiles: msg.totalFiles,
      fileNames: msg.fileNames || [msg.fileName],
      status: 'AWAITING_HEADER',
      header: null,
      chunks: [],
      receivedBytes: 0,
      startTime: null,
      watchdogTimer: null,
    };
    this.receiverSessions.set(fromPeerId, session);

    if (this.onIncomingPrompt) {
      this.onIncomingPrompt({
        transferId: session.transferId,
        fromPeerId,
        senderName,
        totalFiles: msg.totalFiles,
        fileName: msg.fileName,
        fileNames: session.fileNames,
      });
    }
  }

  onCancelProposedTransfer(fromPeerId) {
    const session = this.receiverSessions.get(fromPeerId);
    if (session?.watchdogTimer) clearTimeout(session.watchdogTimer);
    this.receiverSessions.delete(fromPeerId);
    if (this.onCancelled) this.onCancelled(fromPeerId);
  }

  onFileHeader(fromPeerId, msg) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || session.status === 'ABORTED') return;

    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);

    session.header        = msg;
    session.chunks        = [];
    session.receivedBytes = 0;
    session.startTime     = Date.now();
    session.status        = 'RECEIVING';

    logger.info('TRANSFER', `Fájl fogadása indult: ${msg.name} (${msg.size} B) [${msg.currentIndex}/${msg.totalFiles}]`);
    this.acquireWakeLock();

    session.watchdogTimer = this.startReceiverWatchdog(fromPeerId);
  }

  handleIncomingChunk(fromPeerId, buffer) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header || session.status !== 'RECEIVING') return;

    // Reset watchdog on each chunk
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer = this.startReceiverWatchdog(fromPeerId);

    session.chunks.push(buffer);
    session.receivedBytes += buffer.byteLength;

    const elapsed   = Math.max((Date.now() - session.startTime) / 1000, 0.001);
    const speed     = session.receivedBytes / elapsed;
    const remaining = Math.max(session.header.size - session.receivedBytes, 0);
    const eta       = speed > 0 ? remaining / speed : 0;
    const progress  = Math.min(100, Math.round((session.receivedBytes / session.header.size) * 100));

    if (this.onProgress) {
      this.onProgress({
        direction: 'receive',
        fileName: session.header.name,
        fileSize: session.header.size,
        progress,
        speed,
        eta,
        currentIndex: session.header.currentIndex,
        totalFiles:   session.header.totalFiles,
      });
    }
  }

  onFileEnd(fromPeerId, msg) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header) return;

    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer = null;

    const expectedBytes = msg.totalBytes ?? session.header.size;
    const isComplete    = session.receivedBytes === expectedBytes;

    if (!isComplete) {
      logger.error('TRANSFER', `Hiányos fájl "${session.header.name}": érkezett ${session.receivedBytes}B, várt ${expectedBytes}B.`);
      session.status = 'ABORTED';
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
      session.header        = null;
      session.chunks        = [];
      session.receivedBytes = 0;
      return;
    }

    logger.success('TRANSFER', `Fájl sikeresen beérkezett: ${session.header.name} (${expectedBytes} B)`);

    const blob = new Blob(session.chunks, { type: session.header.mimeType });
    const file = new File([blob], session.header.name, { type: session.header.mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (this.onFileReceived) {
      this.onFileReceived({
        file,
        blobUrl,
        name:         session.header.name,
        size:         session.header.size,
        mimeType:     session.header.mimeType,
        currentIndex: session.header.currentIndex || 1,
        totalFiles:   session.header.totalFiles   || 1,
        fromPeerId,
      });
    }

    if ((session.header.currentIndex || 1) >= (session.header.totalFiles || 1)) {
      session.status = 'DONE';
      this.receiverSessions.delete(fromPeerId);
      this.releaseWakeLock();
    } else {
      session.status        = 'AWAITING_HEADER';
      session.header        = null;
      session.chunks        = [];
      session.receivedBytes = 0;
    }
  }

  startReceiverWatchdog(fromPeerId) {
    return setTimeout(() => {
      const session = this.receiverSessions.get(fromPeerId);
      if (!session || session.status !== 'RECEIVING') return;
      logger.warn('TRANSFER', `Watchdog lejárt (${fromPeerId}) – nem érkezett adat ${CHUNK_WATCHDOG_MS / 1000} másodpercig.`);
      session.status = 'ABORTED';
      this.receiverSessions.delete(fromPeerId);
      this.releaseWakeLock();
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
    }, CHUNK_WATCHDOG_MS);
  }

  // ─────────────────────────────────────────
  // Sender Message Handlers
  // ─────────────────────────────────────────
  onAcceptTransfer(fromPeerId) {
    const session = this.senderSessions.get(fromPeerId);
    if (!session || session.isExecuting || session.status !== 'PROPOSED') return;
    session.status = 'STREAMING';
    logger.info('TRANSFER', `A fogadó fél elfogadta az átvitelt (${fromPeerId})`);
    this.executeSendFiles(fromPeerId, session.files);
  }

  onRejectTransfer(fromPeerId) {
    logger.info('TRANSFER', `A fogadó fél elutasította az átvitelt (${fromPeerId})`);
    this.senderSessions.delete(fromPeerId);
    this.releaseWakeLock();
    if (this.onRejected) this.onRejected(fromPeerId);
  }

  // ─────────────────────────────────────────
  // Public: Actions
  // ─────────────────────────────────────────
  acceptIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn?.open) {
      try { conn.send(JSON.stringify({ type: 'accept_transfer' })); } catch (_) {}
    }
  }

  rejectIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn?.open) {
      try { conn.send(JSON.stringify({ type: 'reject_transfer' })); } catch (_) {}
    }
    const session = this.receiverSessions.get(fromPeerId);
    if (session?.watchdogTimer) clearTimeout(session.watchdogTimer);
    this.receiverSessions.delete(fromPeerId);
  }

  cancelProposedSend(targetPeerId) {
    const conn = this.connections.get(targetPeerId);
    if (conn?.open) {
      try { conn.send(JSON.stringify({ type: 'cancel_proposed_transfer' })); } catch (_) {}
    }
    const session = this.senderSessions.get(targetPeerId);
    if (session) session.abortController.aborted = true;
    this.senderSessions.delete(targetPeerId);
    this.releaseWakeLock();
  }

  async sendFilesToPeer(targetPeerId, fileList) {
    if (!fileList || fileList.length === 0) return;

    logger.info('TRANSFER', `Fájlküldés kezdeményezése: ${fileList.length} db fájl (${targetPeerId})`);

    const session = {
      files: Array.from(fileList),
      status: 'PROPOSED',
      isExecuting: false,
      abortController: { aborted: false },
    };
    this.senderSessions.set(targetPeerId, session);

    const payload = JSON.stringify({
      type:        'propose_transfer',
      transferId:  Date.now() + Math.random(),
      senderName:  this.myDeviceName,
      totalFiles:  fileList.length,
      fileName:    fileList[0]?.name || 'Fájl',
      fileNames:   Array.from(fileList).slice(0, 10).map((f) => f.name),
    });

    let conn = this.connections.get(targetPeerId);
    if (conn?.open) {
      try {
        conn.send(payload);
        return;
      } catch (_) {
        this.connections.delete(targetPeerId);
      }
    }

    this.connectToPeerId(targetPeerId);
    for (let i = 0; i < 30; i++) {
      const curSession = this.senderSessions.get(targetPeerId);
      if (!curSession || curSession.abortController.aborted) return;
      await new Promise((r) => setTimeout(r, 100));
      conn = this.connections.get(targetPeerId);
      if (conn?.open) {
        try {
          conn.send(payload);
          return;
        } catch (_) {}
      }
    }
  }

  async sendFilesToAll(fileList) {
    const peerIds = Array.from(this.connections.keys());
    for (const peerId of peerIds) {
      await this.sendFilesToPeer(peerId, fileList);
    }
  }

  // ─────────────────────────────────────────
  // Core Transfer Engine
  // ─────────────────────────────────────────
  async executeSendFiles(targetPeerId, fileList) {
    const session = this.senderSessions.get(targetPeerId);
    if (!session || session.isExecuting) return;
    session.isExecuting = true;

    const conn = this.connections.get(targetPeerId);
    if (!conn?.open) {
      session.abortController.aborted = true;
      this.senderSessions.delete(targetPeerId);
      return;
    }

    this.acquireWakeLock();

    const dc = getRawDataChannel(conn);
    if (dc && dc.bufferedAmountLowThreshold !== undefined) {
      dc.bufferedAmountLowThreshold = LOW_WATERMARK;
    }

    const receiverFamily = this.onlineDevices.get(targetPeerId)?.deviceFamily || 'desktop';
    const chunkSize      = getChunkSizeFor(receiverFamily);

    logger.info('TRANSFER', `Fájlküldés elindult. Cél platform: ${receiverFamily}, Chunk méret: ${chunkSize / 1024} KB`);

    for (let i = 0; i < fileList.length; i++) {
      const current = this.senderSessions.get(targetPeerId);
      if (!current || current.status !== 'STREAMING' || current.abortController.aborted) break;
      if (!conn.open) break;

      await this.streamFile(conn, dc, session.abortController, fileList[i], i + 1, fileList.length, chunkSize);
    }

    this.senderSessions.delete(targetPeerId);
    this.releaseWakeLock();
  }

  async streamFile(conn, dc, abortController, file, currentIndex, totalFiles, chunkSize) {
    if (abortController.aborted || !conn.open) return;

    logger.info('TRANSFER', `Fájl küldése folyamatban: ${file.name} (${file.size} B) [${currentIndex}/${totalFiles}]`);

    try {
      conn.send(JSON.stringify({
        type: 'header',
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        currentIndex,
        totalFiles,
      }));
    } catch (e) {
      logger.error('TRANSFER', `Fejléc küldési hiba: ${e.message}`);
      abortController.aborted = true;
      return;
    }

    const startTime = Date.now();
    let offset      = 0;

    while (offset < file.size) {
      if (abortController.aborted || !conn.open) return;

      if (dc && dc.bufferedAmount > HIGH_WATERMARK) {
        try {
          await waitForDrain(dc, abortController);
        } catch {
          return;
        }
      }

      if (abortController.aborted || !conn.open) return;

      let chunkBuffer;
      try {
        chunkBuffer = await readSlice(file, offset, chunkSize);
      } catch (e) {
        logger.error('TRANSFER', `Fájlolvasási hiba: ${e.message}`);
        abortController.aborted = true;
        return;
      }

      if (abortController.aborted || !conn.open) return;

      try {
        conn.send(chunkBuffer);
      } catch (e) {
        logger.error('TRANSFER', `Adatcsatorna küldési hiba: ${e.message}`);
        abortController.aborted = true;
        return;
      }

      offset += chunkBuffer.byteLength;

      const elapsed   = Math.max((Date.now() - startTime) / 1000, 0.001);
      const speed     = offset / elapsed;
      const remaining = Math.max(file.size - offset, 0);
      const eta       = speed > 0 ? remaining / speed : 0;
      const progress  = Math.min(100, Math.round((offset / file.size) * 100));

      if (this.onProgress) {
        this.onProgress({
          direction: 'send',
          fileName: file.name,
          fileSize: file.size,
          progress,
          speed,
          eta,
          currentIndex,
          totalFiles,
        });
      }
    }

    if (!abortController.aborted && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'end', name: file.name, totalBytes: file.size }));
        logger.success('TRANSFER', `Fájl sikeresen elküldve: ${file.name}`);
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────
  // iOS / Screen WakeLock & Lifecycle
  // ─────────────────────────────────────────
  async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLockSentinel) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        logger.info('SYSTEM', 'Screen WakeLock aktiválva (képernyő ébrentartás átvitel alatt).');
      }
    } catch (_) {}
  }

  releaseWakeLock() {
    try {
      if (this.wakeLockSentinel) {
        this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch (_) {}
  }

  setupLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logger.info('SYSTEM', 'Alkalmazás előtérbe került (képernyő feloldva/visszatérés).');
        if (this.peer?.disconnected && !this.peer.destroyed) {
          try { this.peer.reconnect(); } catch (_) {}
        }
        this.probeOtherSlots();
      }
    });

    window.addEventListener('online', () => {
      logger.info('SYSTEM', 'Hálózati kapcsolat helyreállt (online esemény).');
      if (this.peer?.disconnected && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch (_) {}
      }
      this.probeOtherSlots();
    });

    window.addEventListener('hashchange', () => {
      this.checkDirectUrlConnect();
    });
  }

  // ─────────────────────────────────────────
  // Public: Teardown
  // ─────────────────────────────────────────
  destroy() {
    this.isDestroyed = true;
    if (this.probeTimer) clearInterval(this.probeTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.releaseWakeLock();

    for (const session of this.senderSessions.values()) {
      session.abortController.aborted = true;
    }
    for (const session of this.receiverSessions.values()) {
      if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }

    this.connections.clear();
    this.onlineDevices.clear();
    this.senderSessions.clear();
    this.receiverSessions.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
