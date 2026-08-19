import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';
import { platform } from '../platform';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────
// Transfer Constants
// ─────────────────────────────────────────────
const HIGH_WATERMARK    = 256 * 1024;
const LOW_WATERMARK     = 32  * 1024;
const CHUNK_WATCHDOG_MS = 45_000;
const HEARTBEAT_MS      = 5_000;
const MAX_SLOTS         = 10;
const PROBE_INTERVAL_MS = 2500;

/**
 * STUN + TURN relay servers for full NAT traversal (4G/5G CGNAT, Symmetric NAT).
 */
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username:   'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 4,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function resolveRoomId() {
  try {
    const hash  = window.location.hash;
    const match = hash.match(/[#&]room=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : 'lobby';
  } catch (_) {
    return 'lobby';
  }
}

function getSlotPrefix(roomId) {
  return `airdrop-v7-${roomId}-`;
}

function getChunkSizeFor(receiverFamily) {
  return receiverFamily === 'ios' ? 16 * 1024 : 64 * 1024;
}

function readSlice(file, offset, size) {
  return new Promise((resolve, reject) => {
    const slice  = file.slice(offset, offset + size);
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(slice);
  });
}

function getRawDataChannel(conn) {
  return conn?._dc ?? conn?.dataChannel ?? conn?._channel ?? null;
}

function waitForDrain(dc, abortController) {
  return new Promise((resolve, reject) => {
    if (abortController.aborted)               { reject(new Error('aborted')); return; }
    if (dc.bufferedAmount <= LOW_WATERMARK)    { resolve(); return; }

    const onLow = () => { dc.removeEventListener('bufferedamountlow', onLow); resolve(); };
    dc.addEventListener('bufferedamountlow', onLow);

    const fallback    = setTimeout(() => { dc.removeEventListener('bufferedamountlow', onLow); resolve(); }, 500);
    const abortCheck  = setInterval(() => {
      if (abortController.aborted) {
        clearInterval(abortCheck); clearTimeout(fallback);
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
    this.roomId         = resolveRoomId();
    this.slotPrefix     = getSlotPrefix(this.roomId);

    this.peer           = null;
    this.myId           = null;
    this.mySlotIndex    = null;  // 1-MAX_SLOTS, or 0 if we got a random extra ID
    this.myDeviceName   = detectDeviceName();

    this.connections    = new Map();  // peerId → DataConnection
    this.onlineDevices  = new Map();  // peerId → device info
    this.senderSessions = new Map();
    this.receiverSessions = new Map();

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

    logger.info('SYSTEM', `Eszköz: ${this.myDeviceName} | Szoba: ${this.roomId}`);
    this.connect();
    this.startHeartbeats();
  }

  // ─────────────────────────────────────────
  // Slot Allocation → PeerJS Registration
  // ─────────────────────────────────────────
  connect() {
    if (this.isDestroyed) return;
    this.tryClaimSlot(1);
  }

  tryClaimSlot(slotIndex) {
    if (this.isDestroyed) return;
    if (slotIndex > MAX_SLOTS) {
      // All slots taken → use random extra ID
      const extra = `${this.slotPrefix}extra-${Math.random().toString(36).substring(2, 9)}`;
      this.mySlotIndex = 0;
      this.registerPeer(extra);
      return;
    }

    const slotId = `${this.slotPrefix}${slotIndex}`;
    logger.info('PEER', `Slot foglalás kísérlet: ${slotId}`);

    const peer = new Peer(slotId, {
      host:   '0.peerjs.com',
      port:   443,
      path:   '/',
      secure: true,
      debug:  0,
      config: RTC_CONFIG,
    });

    const cleanup = () => {
      peer.removeAllListeners?.();
      try { if (!peer.destroyed) peer.destroy(); } catch (_) {}
    };

    peer.on('open', (id) => {
      if (this.isDestroyed) { cleanup(); return; }
      this.mySlotIndex = slotIndex;
      this.finalizeConnection(peer, id);
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        logger.info('PEER', `Slot foglalt: ${slotId}, következő...`);
        cleanup();
        this.tryClaimSlot(slotIndex + 1);
      } else if (err.type === 'network' || err.type === 'server-error') {
        logger.warn('PEER', `Hálózati hiba (${err.type}) – újrapróbálás 3mp múlva...`);
        cleanup();
        setTimeout(() => this.tryClaimSlot(slotIndex), 3000);
      } else if (err.type !== 'peer-unavailable') {
        logger.error('PEER', `PeerJS hiba [${err.type}]: ${err.message}`);
      }
    });
  }

  registerPeer(peerId) {
    if (this.isDestroyed) return;
    logger.info('PEER', `Regisztráció extra ID-val: ${peerId}`);

    const peer = new Peer(peerId, {
      host:   '0.peerjs.com',
      port:   443,
      path:   '/',
      secure: true,
      debug:  0,
      config: RTC_CONFIG,
    });

    peer.on('open', (id) => {
      if (this.isDestroyed) { try { peer.destroy(); } catch (_) {} return; }
      this.finalizeConnection(peer, id);
    });

    peer.on('error', (err) => {
      if (err.type !== 'peer-unavailable') {
        logger.warn('PEER', `Extra peer hiba [${err.type}]: ${err.message}`);
      }
    });
  }

  finalizeConnection(peer, id) {
    this.peer = peer;
    this.myId = id;
    logger.success('PEER', `Online! ID: ${id} (slot: ${this.mySlotIndex || 'extra'})`);

    if (this.onStatusChange) this.onStatusChange(true);

    this.peer.on('connection', (conn) => {
      logger.info('PEER', `Bejövő kapcsolat: ${conn.peer}`);
      this.setupConnectionEvents(conn);
    });

    this.peer.on('disconnected', () => {
      logger.warn('PEER', 'Kapcsolat megszakadt – újracsatlakozás...');
      if (this.onStatusChange) this.onStatusChange(false);
      if (!this.isDestroyed && !this.peer.destroyed) {
        setTimeout(() => {
          try { this.peer.reconnect(); } catch (_) {
            this.tryClaimSlot(this.mySlotIndex || 1);
          }
        }, 2000);
      }
    });

    this.peer.on('close', () => {
      if (this.onStatusChange) this.onStatusChange(false);
    });

    this.peer.on('error', (err) => {
      if (err.type !== 'peer-unavailable') {
        logger.warn('PEER', `Peer hiba [${err.type}]: ${err.message}`);
      }
    });

    // Check for QR/link direct connect
    this.checkUrlForDirectConnect();
    this.startProbing();
    this.notifyDevicesUpdate();
  }

  // ─────────────────────────────────────────
  // Device Discovery / Slot Probing
  // ─────────────────────────────────────────
  startProbing() {
    this.probeOtherSlots();
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = setInterval(() => this.probeOtherSlots(), PROBE_INTERVAL_MS);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;
      const targetId = `${this.slotPrefix}${i}`;

      // ─── Anti-glare rule ───
      // Only the device with the LOWER slot index initiates.
      // mySlotIndex = 0 means we have an extra-... ID → always initiate (0 < any positive slot).
      // mySlotIndex > 0: skip if our slot number is GREATER than the target slot (they'll connect to us).
      if (this.mySlotIndex > 0 && this.mySlotIndex > i) {
        continue;
      }

      const existing = this.connections.get(targetId);
      if (!existing || !existing.open) {
        this.connectToPeerId(targetId);
      }
    }
    this.notifyDevicesUpdate();
  }

  connectToPeerId(targetId) {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;
    if (!targetId || targetId === this.myId) return;

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
      logger.warn('PEER', `Kapcsolódási hiba (${targetId}): ${e.message}`);
    }
  }

  // ─────────────────────────────────────────
  // Direct Connect via URL (QR / Share Link)
  // ─────────────────────────────────────────
  checkUrlForDirectConnect() {
    try {
      const hash  = window.location.hash;
      const match = hash.match(/[#&]connect=([^&]+)/);
      if (match && match[1] && match[1] !== this.myId) {
        const targetId = decodeURIComponent(match[1]);
        logger.info('PEER', `Közvetlen QR párosítás: ${targetId}`);
        this.connectToPeerId(targetId);
      }
    } catch (_) {}
  }

  getShareUrl() {
    if (typeof window === 'undefined' || !this.myId) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}#connect=${encodeURIComponent(this.myId)}`;
  }

  // ─────────────────────────────────────────
  // Connection Lifecycle & ICE Monitoring
  // ─────────────────────────────────────────
  setupConnectionEvents(conn) {
    if (!conn) return;

    const attachIceListeners = () => {
      const pc = conn.peerConnection;
      if (!pc) return;
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logger.ice(`ICE [${conn.peer.substring(0, 20)}...]: ${state}`);
        if (state === 'failed') {
          logger.error('ICE', `ICE kapcsolat meghiúsult (${conn.peer.substring(0, 20)}...)`);
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const type  = event.candidate.type     || 'unknown';
          const proto = event.candidate.protocol || 'udp';
          logger.ice(`Jelölt: [${type.toUpperCase()}/${proto.toUpperCase()}]`);
        }
      };
    };

    if (conn.peerConnection) {
      attachIceListeners();
    } else {
      setTimeout(() => attachIceListeners(), 150);
    }

    conn.on('open', () => {
      const peerName   = conn.metadata?.deviceInfo || conn.metadata?.deviceType || 'Eszköz';
      const peerFamily = conn.metadata?.deviceFamily || 'desktop';

      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id:         conn.peer,
        name:       peerName,
        deviceInfo: peerName,
        deviceType: peerName,
        deviceFamily: peerFamily,
      });

      logger.success('PEER', `Kapcsolat létrejött: ${peerName}`);

      const dc = getRawDataChannel(conn);
      if (dc) dc.bufferedAmountLowThreshold = LOW_WATERMARK;

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

    conn.on('data',  (data) => this.handleIncomingData(conn.peer, data));

    conn.on('close', () => {
      logger.info('PEER', `Kapcsolat lezárult: ${conn.peer}`);
      this.cleanupPeerSession(conn.peer, 'A kapcsolat lezárult.');
    });

    conn.on('error', (err) => {
      logger.error('PEER', `Kapcsolat hiba: ${err.message || err}`);
      this.cleanupPeerSession(conn.peer, `Hiba: ${err.message || err}`);
    });
  }

  cleanupPeerSession(peerId, reason = '') {
    const hadActiveSender   = this.senderSessions.has(peerId);
    const hadActiveReceiver = this.receiverSessions.has(peerId);

    const senderSession = this.senderSessions.get(peerId);
    if (senderSession) senderSession.abortController.aborted = true;

    const receiverSession = this.receiverSessions.get(peerId);
    if (receiverSession?.watchdogTimer) clearTimeout(receiverSession.watchdogTimer);

    this.connections.delete(peerId);
    this.onlineDevices.delete(peerId);
    this.senderSessions.delete(peerId);
    this.receiverSessions.delete(peerId);
    this.releaseWakeLock();

    if ((hadActiveSender || hadActiveReceiver) && this.onTransferAborted) {
      logger.warn('TRANSFER', `Átvitel megszakadt. Ok: ${reason}`);
      this.onTransferAborted(peerId);
    }

    this.notifyDevicesUpdate();
  }

  notifyDevicesUpdate() {
    const self = {
      id:         this.myId,
      name:       this.myDeviceName,
      deviceInfo: this.myDeviceName,
      deviceType: this.myDeviceName,
      isSelf:     true,
    };

    const peers = Array.from(this.onlineDevices.values()).map((p) => ({
      ...p,
      name:       p.name       || p.deviceInfo || 'Eszköz',
      deviceInfo: p.deviceInfo || p.name       || 'Eszköz',
      deviceType: p.deviceType || p.name       || 'Eszköz',
    }));

    if (this.onDevicesUpdate) this.onDevicesUpdate([self, ...peers]);
  }

  // ─────────────────────────────────────────
  // Heartbeat Keepalive (Mobile NAT retention)
  // ─────────────────────────────────────────
  startHeartbeats() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      const ping = JSON.stringify({ type: 'ping', t: Date.now() });
      this.connections.forEach((conn, peerId) => {
        if (conn?.open) {
          try { conn.send(ping); } catch (_) {
            this.cleanupPeerSession(peerId, 'Heartbeat küldési hiba');
          }
        }
      });
    }, HEARTBEAT_MS);
  }

  // ─────────────────────────────────────────
  // Central Message Router
  // ─────────────────────────────────────────
  handleIncomingData(fromPeerId, data) {
    if (data instanceof ArrayBuffer || data?.buffer instanceof ArrayBuffer) {
      this.handleIncomingChunk(fromPeerId, data instanceof ArrayBuffer ? data : data.buffer);
      return;
    }
    if (typeof data !== 'string') return;
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'ping':
        try {
          const conn = this.connections.get(fromPeerId);
          if (conn?.open) conn.send(JSON.stringify({ type: 'pong' }));
        } catch (_) {}
        return;
      case 'pong':                         return;
      case 'handshake':                    return this.onHandshake(fromPeerId, msg);
      case 'propose_transfer':             return this.onProposeTransfer(fromPeerId, msg);
      case 'cancel_proposed_transfer':     return this.onCancelProposedTransfer(fromPeerId);
      case 'accept_transfer':              return this.onAcceptTransfer(fromPeerId);
      case 'reject_transfer':              return this.onRejectTransfer(fromPeerId);
      case 'header':                       return this.onFileHeader(fromPeerId, msg);
      case 'end':                          return this.onFileEnd(fromPeerId, msg);
      default:
        logger.warn('PEER', `Ismeretlen üzenet: ${msg.type}`);
    }
  }

  // ─────────────────────────────────────────
  // Receiver Handlers
  // ─────────────────────────────────────────
  onHandshake(fromPeerId, msg) {
    const peerName   = msg.deviceType || msg.deviceInfo || 'Eszköz';
    const peerFamily = msg.deviceFamily || 'desktop';
    this.onlineDevices.set(fromPeerId, {
      id: fromPeerId, name: peerName, deviceInfo: peerName,
      deviceType: peerName, deviceFamily: peerFamily,
    });
    this.notifyDevicesUpdate();
  }

  onProposeTransfer(fromPeerId, msg) {
    const senderName = msg.senderName || this.onlineDevices.get(fromPeerId)?.name || 'Eszköz';
    logger.info('TRANSFER', `Bejövő: ${msg.totalFiles} fájl (${senderName})`);
    const session = {
      transferId: msg.transferId || Date.now(),
      senderName,
      totalFiles: msg.totalFiles,
      fileNames:  msg.fileNames || [msg.fileName],
      status:     'AWAITING_HEADER',
      header: null, chunks: [], receivedBytes: 0, startTime: null, watchdogTimer: null,
    };
    this.receiverSessions.set(fromPeerId, session);
    if (this.onIncomingPrompt) {
      this.onIncomingPrompt({
        transferId: session.transferId, fromPeerId, senderName,
        totalFiles: msg.totalFiles, fileName: msg.fileName, fileNames: session.fileNames,
      });
    }
  }

  onCancelProposedTransfer(fromPeerId) {
    const s = this.receiverSessions.get(fromPeerId);
    if (s?.watchdogTimer) clearTimeout(s.watchdogTimer);
    this.receiverSessions.delete(fromPeerId);
    if (this.onCancelled) this.onCancelled(fromPeerId);
  }

  onFileHeader(fromPeerId, msg) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || session.status === 'ABORTED') return;
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.header = msg;
    session.chunks = [];
    session.receivedBytes = 0;
    session.startTime = Date.now();
    session.status    = 'RECEIVING';
    logger.info('TRANSFER', `Fogadás: ${msg.name} [${msg.currentIndex}/${msg.totalFiles}]`);
    this.acquireWakeLock();
    session.watchdogTimer = this.startReceiverWatchdog(fromPeerId);
  }

  handleIncomingChunk(fromPeerId, buffer) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header || session.status !== 'RECEIVING') return;
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer  = this.startReceiverWatchdog(fromPeerId);
    session.chunks.push(buffer);
    session.receivedBytes += buffer.byteLength;
    const elapsed  = Math.max((Date.now() - session.startTime) / 1000, 0.001);
    const speed    = session.receivedBytes / elapsed;
    const remaining = Math.max(session.header.size - session.receivedBytes, 0);
    const eta      = speed > 0 ? remaining / speed : 0;
    const progress = Math.min(100, Math.round((session.receivedBytes / session.header.size) * 100));
    if (this.onProgress) {
      this.onProgress({
        direction: 'receive', fileName: session.header.name, fileSize: session.header.size,
        progress, speed, eta, currentIndex: session.header.currentIndex, totalFiles: session.header.totalFiles,
      });
    }
  }

  onFileEnd(fromPeerId, msg) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header) return;
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer = null;

    const expectedBytes = msg.totalBytes ?? session.header.size;
    if (session.receivedBytes !== expectedBytes) {
      logger.error('TRANSFER', `Hiányos fájl "${session.header.name}": ${session.receivedBytes}/${expectedBytes}B`);
      session.status = 'ABORTED';
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
      session.header = null; session.chunks = []; session.receivedBytes = 0;
      return;
    }

    logger.success('TRANSFER', `Fájl megérkezett: ${session.header.name} (${expectedBytes}B)`);
    const blob    = new Blob(session.chunks, { type: session.header.mimeType });
    const file    = new File([blob], session.header.name, { type: session.header.mimeType });
    const blobUrl = URL.createObjectURL(blob);
    if (this.onFileReceived) {
      this.onFileReceived({
        file, blobUrl, name: session.header.name, size: session.header.size,
        mimeType: session.header.mimeType,
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
      session.status    = 'AWAITING_HEADER';
      session.header    = null;
      session.chunks    = [];
      session.receivedBytes = 0;
    }
  }

  startReceiverWatchdog(fromPeerId) {
    return setTimeout(() => {
      const session = this.receiverSessions.get(fromPeerId);
      if (!session || session.status !== 'RECEIVING') return;
      logger.warn('TRANSFER', `Watchdog: ${CHUNK_WATCHDOG_MS / 1000}mp óta nincs adat.`);
      session.status = 'ABORTED';
      this.receiverSessions.delete(fromPeerId);
      this.releaseWakeLock();
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
    }, CHUNK_WATCHDOG_MS);
  }

  // ─────────────────────────────────────────
  // Sender Handlers
  // ─────────────────────────────────────────
  onAcceptTransfer(fromPeerId) {
    const session = this.senderSessions.get(fromPeerId);
    if (!session || session.isExecuting || session.status !== 'PROPOSED') return;
    session.status      = 'STREAMING';
    logger.info('TRANSFER', `Elfogadva`);
    this.executeSendFiles(fromPeerId, session.files);
  }

  onRejectTransfer(fromPeerId) {
    logger.info('TRANSFER', `Elutasítva`);
    this.senderSessions.delete(fromPeerId);
    this.releaseWakeLock();
    if (this.onRejected) this.onRejected(fromPeerId);
  }

  // ─────────────────────────────────────────
  // Public: Receiver Actions
  // ─────────────────────────────────────────
  acceptIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn?.open) try { conn.send(JSON.stringify({ type: 'accept_transfer' })); } catch (_) {}
  }

  rejectIncoming(fromPeerId) {
    const conn = this.connections.get(fromPeerId);
    if (conn?.open) try { conn.send(JSON.stringify({ type: 'reject_transfer' })); } catch (_) {}
    const s = this.receiverSessions.get(fromPeerId);
    if (s?.watchdogTimer) clearTimeout(s.watchdogTimer);
    this.receiverSessions.delete(fromPeerId);
  }

  cancelProposedSend(targetPeerId) {
    const conn = this.connections.get(targetPeerId);
    if (conn?.open) try { conn.send(JSON.stringify({ type: 'cancel_proposed_transfer' })); } catch (_) {}
    const s = this.senderSessions.get(targetPeerId);
    if (s) s.abortController.aborted = true;
    this.senderSessions.delete(targetPeerId);
    this.releaseWakeLock();
  }

  // ─────────────────────────────────────────
  // Public: Send Files
  // ─────────────────────────────────────────
  async sendFilesToPeer(targetPeerId, fileList) {
    if (!fileList || fileList.length === 0) return;
    logger.info('TRANSFER', `Küldés: ${fileList.length} fájl → ${targetPeerId}`);

    const session = {
      files:           Array.from(fileList),
      status:          'PROPOSED',
      isExecuting:     false,
      abortController: { aborted: false },
    };
    this.senderSessions.set(targetPeerId, session);

    const payload = JSON.stringify({
      type:       'propose_transfer',
      transferId: Date.now() + Math.random(),
      senderName: this.myDeviceName,
      totalFiles: fileList.length,
      fileName:   fileList[0]?.name || 'Fájl',
      fileNames:  Array.from(fileList).slice(0, 10).map((f) => f.name),
    });

    let conn = this.connections.get(targetPeerId);
    if (conn?.open) {
      try { conn.send(payload); return; } catch (_) {
        this.connections.delete(targetPeerId);
      }
    }

    this.connectToPeerId(targetPeerId);
    for (let i = 0; i < 40; i++) {
      const cur = this.senderSessions.get(targetPeerId);
      if (!cur || cur.abortController.aborted) return;
      await new Promise((r) => setTimeout(r, 100));
      conn = this.connections.get(targetPeerId);
      if (conn?.open) {
        try { conn.send(payload); return; } catch (_) {}
      }
    }
    logger.warn('TRANSFER', 'Időtúllépés – nem sikerült kapcsolódni.');
  }

  async sendFilesToAll(fileList) {
    for (const peerId of Array.from(this.connections.keys())) {
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
    if (dc && dc.bufferedAmountLowThreshold !== undefined) dc.bufferedAmountLowThreshold = LOW_WATERMARK;
    const receiverFamily = this.onlineDevices.get(targetPeerId)?.deviceFamily || 'desktop';
    const chunkSize      = getChunkSizeFor(receiverFamily);
    logger.info('TRANSFER', `Küldés indul. Platform: ${receiverFamily}, Chunk: ${chunkSize / 1024}KB`);

    for (let i = 0; i < fileList.length; i++) {
      const cur = this.senderSessions.get(targetPeerId);
      if (!cur || cur.status !== 'STREAMING' || cur.abortController.aborted) break;
      if (!conn.open) break;
      await this.streamFile(conn, dc, session.abortController, fileList[i], i + 1, fileList.length, chunkSize);
    }
    this.senderSessions.delete(targetPeerId);
    this.releaseWakeLock();
  }

  async streamFile(conn, dc, abortController, file, currentIndex, totalFiles, chunkSize) {
    if (abortController.aborted || !conn.open) return;
    logger.info('TRANSFER', `Küldés: ${file.name} [${currentIndex}/${totalFiles}]`);
    try {
      conn.send(JSON.stringify({
        type:         'header',
        name:         file.name,
        size:         file.size,
        mimeType:     file.type || 'application/octet-stream',
        currentIndex,
        totalFiles,
      }));
    } catch (e) {
      logger.error('TRANSFER', `Fejléc hiba: ${e.message}`);
      abortController.aborted = true; return;
    }
    const startTime = Date.now();
    let offset = 0;
    while (offset < file.size) {
      if (abortController.aborted || !conn.open) return;
      if (dc && dc.bufferedAmount > HIGH_WATERMARK) {
        try { await waitForDrain(dc, abortController); } catch { return; }
      }
      if (abortController.aborted || !conn.open) return;
      let chunk;
      try { chunk = await readSlice(file, offset, chunkSize); } catch (e) {
        logger.error('TRANSFER', `Olvasási hiba: ${e.message}`);
        abortController.aborted = true; return;
      }
      if (abortController.aborted || !conn.open) return;
      try { conn.send(chunk); } catch (e) {
        logger.error('TRANSFER', `Küldési hiba: ${e.message}`);
        abortController.aborted = true; return;
      }
      offset += chunk.byteLength;
      const elapsed   = Math.max((Date.now() - startTime) / 1000, 0.001);
      const speed     = offset / elapsed;
      const remaining = Math.max(file.size - offset, 0);
      const eta       = speed > 0 ? remaining / speed : 0;
      const progress  = Math.min(100, Math.round((offset / file.size) * 100));
      if (this.onProgress) {
        this.onProgress({ direction: 'send', fileName: file.name, fileSize: file.size, progress, speed, eta, currentIndex, totalFiles });
      }
    }
    if (!abortController.aborted && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'end', name: file.name, totalBytes: file.size }));
        logger.success('TRANSFER', `Elküldve: ${file.name}`);
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────
  // WakeLock & Lifecycle
  // ─────────────────────────────────────────
  async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLockSentinel) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        logger.info('SYSTEM', 'WakeLock aktiválva.');
      }
    } catch (_) {}
  }

  releaseWakeLock() {
    try {
      if (this.wakeLockSentinel) { this.wakeLockSentinel.release(); this.wakeLockSentinel = null; }
    } catch (_) {}
  }

  setupLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logger.info('SYSTEM', 'App előtérbe kerülve.');
        if (this.peer?.disconnected && !this.peer?.destroyed) {
          try { this.peer.reconnect(); } catch (_) { this.tryClaimSlot(this.mySlotIndex || 1); }
        }
        this.probeOtherSlots?.();
      }
    });

    window.addEventListener('online', () => {
      logger.info('SYSTEM', 'Hálózat visszaállt.');
      if (this.peer?.disconnected && !this.peer?.destroyed) {
        try { this.peer.reconnect(); } catch (_) { this.tryClaimSlot(this.mySlotIndex || 1); }
      }
      this.probeOtherSlots?.();
    });

    window.addEventListener('hashchange', () => {
      if (this.myId) this.checkUrlForDirectConnect();
    });
  }

  // ─────────────────────────────────────────
  // Teardown
  // ─────────────────────────────────────────
  destroy() {
    this.isDestroyed = true;
    if (this.probeTimer)     clearInterval(this.probeTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.releaseWakeLock();
    for (const s of this.senderSessions.values())   s.abortController.aborted = true;
    for (const s of this.receiverSessions.values())  if (s.watchdogTimer) clearTimeout(s.watchdogTimer);
    if (this.peer) { try { this.peer.destroy(); } catch (_) {} this.peer = null; }
    this.connections.clear();
    this.onlineDevices.clear();
    this.senderSessions.clear();
    this.receiverSessions.clear();
  }
}

export const peerNetworkService = new PeerNetworkService();
