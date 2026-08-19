import Peer from 'peerjs';
import { detectDeviceName } from '../utils/formatters';
import { platform } from '../platform';

// ─────────────────────────────────────────────
// Transfer Constants
// ─────────────────────────────────────────────
const CHUNK_SIZE         = platform.chunkSize; // default for sending to unknown receivers
const HIGH_WATERMARK     = 256 * 1024;
const LOW_WATERMARK      = 32 * 1024;
const CHUNK_WATCHDOG_MS  = 20_000;
const MAX_SLOTS          = 6;
const SLOT_PREFIX        = 'airdrop-p2p-v5-';

/**
 * Returns the ideal chunk size for a given receiver peer.
 * If the receiver is iOS (WebKit), we use 16 KB to avoid silent packet drops.
 * For Android and Desktop (Chromium), 64 KB is safe and roughly 4× faster.
 */
function getChunkSizeFor(receiverFamily) {
  return receiverFamily === 'ios' ? 16 * 1024 : 64 * 1024;
}

// ─────────────────────────────────────────────
// Sender Session State Machine
//   IDLE → PROPOSED → STREAMING → DONE | ABORTED
// ─────────────────────────────────────────────
function makeSenderSession(files) {
  return {
    files: Array.from(files),
    status: 'PROPOSED',   // 'PROPOSED' | 'STREAMING' | 'DONE' | 'ABORTED'
    isExecuting: false,
    abortController: { aborted: false },
  };
}

// ─────────────────────────────────────────────
// Receiver Session State Machine
//   IDLE → AWAITING_HEADER → RECEIVING → DONE | ABORTED
// ─────────────────────────────────────────────
function makeReceiverSession({ transferId, senderName, totalFiles, fileNames }) {
  return {
    transferId,
    senderName,
    totalFiles,
    fileNames,
    status: 'AWAITING_HEADER',  // 'AWAITING_HEADER' | 'RECEIVING' | 'DONE' | 'ABORTED'
    header: null,
    chunks: [],
    receivedBytes: 0,
    startTime: null,
    watchdogTimer: null,
  };
}

// ─────────────────────────────────────────────
// Utility: wait for bufferedamountlow event
// Returns a Promise that resolves when the DC
// is ready to accept more data, or rejects on abort.
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

    // Safety fallback: if event never fires (some browsers), poll once after 500ms
    const fallback = setTimeout(() => {
      dc.removeEventListener('bufferedamountlow', onLow);
      resolve();
    }, 500);

    // Also clean up if aborted externally
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
// Works across PeerJS v1.3–v1.5 and browsers
// ─────────────────────────────────────────────
function getRawDataChannel(conn) {
  return conn._dc ?? conn.dataChannel ?? conn._channel ?? null;
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

    this.connections    = new Map(); // peerId → PeerJS DataConnection
    this.onlineDevices  = new Map(); // peerId → { id, name, deviceInfo, deviceType }
    this.senderSessions = new Map(); // peerId → SenderSession
    this.receiverSessions = new Map(); // peerId → ReceiverSession
    this.graceTimers    = new Map(); // peerId → setTimeout

    // Callbacks (set via init())

    this.onStatusChange    = null;
    this.onDevicesUpdate   = null;
    this.onProgress        = null;
    this.onFileReceived    = null;
    this.onIncomingPrompt  = null;
    this.onRejected        = null;
    this.onCancelled       = null;
    this.onTransferAborted = null;

    this.probeTimer  = null;
    this.isDestroyed = false;
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
    this.tryClaimSlot(1);
  }

  // ─────────────────────────────────────────
  // Slot Claiming & PeerJS Init
  // ─────────────────────────────────────────
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
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      peer.on('open', (id) => {
        this.peer = peer;
        this.myId = id;
        this.mySlotIndex = slotIndex;
        if (this.onStatusChange) this.onStatusChange(true);
        this.peer.on('connection', (conn) => this.setupConnectionEvents(conn));
        this.startProbing();
        this.startHeartbeats();
        this.setupLifecycleListeners();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          peer.destroy();
          this.tryClaimSlot(slotIndex + 1);
        } else {
          console.warn('[Peer] Error:', err.type, err.message);
        }
      });

      peer.on('disconnected', () => {
        if (this.onStatusChange) this.onStatusChange(false);
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.reconnect(); } catch (_) {}
          setTimeout(() => { try { this.peer.reconnect(); } catch (_) {} }, 1000);
        }
      });
    } catch (e) {
      console.error('[Peer] Init exception:', e);
    }
  }

  // ─────────────────────────────────────────
  // Heartbeats & Lifecycle Listeners
  // ─────────────────────────────────────────
  startHeartbeats() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      if (this.peer?.disconnected && !this.peer?.destroyed) {
        try { this.peer.reconnect(); } catch (_) {}
      }
      this.connections.forEach((conn) => {
        if (conn?.open) {
          try { conn.send(JSON.stringify({ type: 'ping' })); } catch (_) {}
        }
      });
    }, 3000);
  }

  setupLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this._hasLifecycleListeners) return;
    this._hasLifecycleListeners = true;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.peer?.disconnected && !this.peer?.destroyed) {
          try { this.peer.reconnect(); } catch (_) {}
        }
        this.probeOtherSlots();
      }
    });

    window.addEventListener('online', () => {
      if (this.peer?.disconnected && !this.peer?.destroyed) {
        try { this.peer.reconnect(); } catch (_) {}
      }
      this.probeOtherSlots();
    });
  }

  // ─────────────────────────────────────────
  // Device Discovery / Probing
  // ─────────────────────────────────────────
  startProbing() {
    this.probeOtherSlots();
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = setInterval(() => this.probeOtherSlots(), 4000);
  }

  probeOtherSlots() {
    if (!this.peer || this.peer.destroyed) return;
    if (this.peer.disconnected) {
      try { this.peer.reconnect(); } catch (_) {}
    }
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;
      const targetId = `${SLOT_PREFIX}${i}`;
      const existing = this.connections.get(targetId);
      if (!existing || !existing.open) this.connectToSlot(targetId);
    }
    this.notifyDevicesUpdate();
  }

  connectToSlot(targetSlotId) {
    if (!this.peer || this.peer.destroyed) return;
    if (this.peer.disconnected) {
      try { this.peer.reconnect(); } catch (_) {}
    }
    try {
      const conn = this.peer.connect(targetSlotId, {
        metadata: { deviceInfo: this.myDeviceName, deviceType: this.myDeviceName },
        reliable: true,
      });
      this.setupConnectionEvents(conn);
    } catch (_) {}
  }

  // ─────────────────────────────────────────
  // Connection Lifecycle
  // ─────────────────────────────────────────
  setupConnectionEvents(conn) {
    conn.on('open', () => {
      if (this.graceTimers.has(conn.peer)) {
        clearTimeout(this.graceTimers.get(conn.peer));
        this.graceTimers.delete(conn.peer);
      }

      const peerName   = conn.metadata?.deviceInfo || conn.metadata?.deviceType || 'Eszköz';
      const peerFamily = conn.metadata?.deviceFamily || 'desktop';
      this.connections.set(conn.peer, conn);
      this.onlineDevices.set(conn.peer, {
        id: conn.peer, name: peerName, deviceInfo: peerName, deviceType: peerName, deviceFamily: peerFamily,
      });

      // Configure native DataChannel for event-driven backpressure
      const dc = getRawDataChannel(conn);
      if (dc) dc.bufferedAmountLowThreshold = LOW_WATERMARK;

      try {
        conn.send(JSON.stringify({
          type: 'handshake',
          deviceInfo:   this.myDeviceName,
          deviceType:   this.myDeviceName,
          deviceFamily: platform.name,          // ← tells the receiver who we are
        }));
      } catch (_) {}

      this.notifyDevicesUpdate();
    });

    conn.on('data', (data) => this.handleIncomingData(conn.peer, data));
    conn.on('close', () => this.cleanupPeerSession(conn.peer));
    conn.on('error', () => this.cleanupPeerSession(conn.peer));
  }

  cleanupPeerSession(peerId) {
    const hadActiveSender   = this.senderSessions.has(peerId);
    const hadActiveReceiver = this.receiverSessions.has(peerId);

    // Abort any active sender transfer
    const senderSession = this.senderSessions.get(peerId);
    if (senderSession) senderSession.abortController.aborted = true;

    // Clear any receiver watchdog
    const receiverSession = this.receiverSessions.get(peerId);
    if (receiverSession?.watchdogTimer) clearTimeout(receiverSession.watchdogTimer);

    this.connections.delete(peerId);

    // If an active transfer was interrupted, clear immediately and abort
    if (hadActiveSender || hadActiveReceiver) {
      if (this.graceTimers.has(peerId)) {
        clearTimeout(this.graceTimers.get(peerId));
        this.graceTimers.delete(peerId);
      }
      this.onlineDevices.delete(peerId);
      this.senderSessions.delete(peerId);
      this.receiverSessions.delete(peerId);
      if (this.onTransferAborted) this.onTransferAborted(peerId);
      this.notifyDevicesUpdate();
      return;
    }

    // Otherwise, retain device in onlineDevices for a 12-second grace period
    // so devices stay continuously visible during app swiping or photo picking
    if (!this.graceTimers.has(peerId)) {
      const timer = setTimeout(() => {
        this.graceTimers.delete(peerId);
        this.onlineDevices.delete(peerId);
        this.senderSessions.delete(peerId);
        this.receiverSessions.delete(peerId);
        this.notifyDevicesUpdate();
      }, 12000);
      this.graceTimers.set(peerId, timer);
    }

    this.notifyDevicesUpdate();
  }

  notifyDevicesUpdate() {
    const self = { id: this.myId, name: this.myDeviceName, deviceInfo: this.myDeviceName, deviceType: this.myDeviceName, isSelf: true };
    const peers = Array.from(this.onlineDevices.values()).map(p => ({
      ...p,
      name:       p.name       || p.deviceInfo || 'Eszköz',
      deviceInfo: p.deviceInfo || p.name       || 'Eszköz',
      deviceType: p.deviceType || p.name       || 'Eszköz',
    }));
    if (this.onDevicesUpdate) this.onDevicesUpdate([self, ...peers]);
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
        try {
          const conn = this.connections.get(fromPeerId);
          if (conn?.open) conn.send(JSON.stringify({ type: 'pong' }));
        } catch (_) {}
        return;
      case 'pong':
        return;
      case 'handshake':              return this.onHandshake(fromPeerId, msg);
      case 'propose_transfer':       return this.onProposeTransfer(fromPeerId, msg);
      case 'cancel_proposed_transfer': return this.onCancelProposedTransfer(fromPeerId);
      case 'accept_transfer':        return this.onAcceptTransfer(fromPeerId);
      case 'reject_transfer':        return this.onRejectTransfer(fromPeerId);
      case 'header':                 return this.onFileHeader(fromPeerId, msg);
      case 'end':                    return this.onFileEnd(fromPeerId, msg);
      default:
        console.warn('[Peer] Unknown message type:', msg.type);
    }
  }

  // ─────────────────────────────────────────
  // Message Handlers (Receiver Side)
  // ─────────────────────────────────────────
  onHandshake(fromPeerId, msg) {
    const peerName   = msg.deviceType || msg.deviceInfo || 'Eszköz';
    const peerFamily = msg.deviceFamily || 'desktop';
    this.onlineDevices.set(fromPeerId, {
      id: fromPeerId, name: peerName, deviceInfo: peerName, deviceType: peerName, deviceFamily: peerFamily,
    });
    this.notifyDevicesUpdate();
  }

  onProposeTransfer(fromPeerId, msg) {
    const senderInfo = this.onlineDevices.get(fromPeerId);
    const senderName = msg.senderName || senderInfo?.name || 'Online Eszköz';

    const session = makeReceiverSession({
      transferId: msg.transferId || Date.now(),
      senderName,
      totalFiles: msg.totalFiles,
      fileNames: msg.fileNames || [msg.fileName],
    });
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

    // Clear previous watchdog before starting new file
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);

    session.header       = msg;
    session.chunks       = [];
    session.receivedBytes = 0;
    session.startTime    = Date.now();
    session.status       = 'RECEIVING';

    // Watchdog: abort if no bytes arrive for CHUNK_WATCHDOG_MS
    session.watchdogTimer = this.startReceiverWatchdog(fromPeerId);
  }

  handleIncomingChunk(fromPeerId, buffer) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header || session.status !== 'RECEIVING') return;

    // Reset watchdog on every chunk received
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer = this.startReceiverWatchdog(fromPeerId);

    session.chunks.push(buffer);
    session.receivedBytes += buffer.byteLength;

    // Emit progress
    const elapsed  = Math.max((Date.now() - session.startTime) / 1000, 0.001);
    const speed    = session.receivedBytes / elapsed;
    const remaining = Math.max(session.header.size - session.receivedBytes, 0);
    const eta      = speed > 0 ? remaining / speed : 0;
    const progress = Math.min(100, Math.round((session.receivedBytes / session.header.size) * 100));

    if (this.onProgress) {
      this.onProgress({
        direction: 'receive',
        fileName: session.header.name,
        fileSize: session.header.size,
        progress, speed, eta,
        currentIndex: session.header.currentIndex,
        totalFiles:   session.header.totalFiles,
      });
    }
  }

  onFileEnd(fromPeerId, msg) {
    const session = this.receiverSessions.get(fromPeerId);
    if (!session || !session.header) return;

    // Clear watchdog – transfer finished (success or error)
    if (session.watchdogTimer) clearTimeout(session.watchdogTimer);
    session.watchdogTimer = null;

    const expectedBytes = msg.totalBytes ?? session.header.size;
    const isComplete    = session.receivedBytes === expectedBytes;

    if (!isComplete) {
      // Csonka fájl – eldobjuk és jelzünk hibát
      console.error(
        `[Peer] Incomplete file "${session.header.name}": ` +
        `got ${session.receivedBytes}B, expected ${expectedBytes}B. Discarding.`
      );
      session.status = 'ABORTED';
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
      // Reset session for next file attempt without deleting entire receiver session
      session.header        = null;
      session.chunks        = [];
      session.receivedBytes = 0;
      return;
    }

    // ✅ Fájl teljes – összerakjuk
    const blob = new Blob(session.chunks, { type: session.header.mimeType });
    const file = new File([blob], session.header.name, { type: session.header.mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (this.onFileReceived) {
      this.onFileReceived({
        file, blobUrl,
        name:         session.header.name,
        size:         session.header.size,
        mimeType:     session.header.mimeType,
        currentIndex: session.header.currentIndex || 1,
        totalFiles:   session.header.totalFiles   || 1,
        fromPeerId,
      });
    }

    // Ha ez volt az utolsó fájl → session lezárása
    if ((session.header.currentIndex || 1) >= (session.header.totalFiles || 1)) {
      session.status = 'DONE';
      this.receiverSessions.delete(fromPeerId);
    } else {
      // Még jönnek fájlok – visszaállítjuk AWAITING_HEADER állapotra
      session.status        = 'AWAITING_HEADER';
      session.header        = null;
      session.chunks        = [];
      session.receivedBytes = 0;
    }
  }

  // Watchdog timer: ha CHUNK_WATCHDOG_MS ideig nem érkezik adat → abort
  startReceiverWatchdog(fromPeerId) {
    return setTimeout(() => {
      const session = this.receiverSessions.get(fromPeerId);
      if (!session || session.status !== 'RECEIVING') return;
      console.warn(`[Peer] Receiver watchdog fired for ${fromPeerId} – aborting stuck transfer.`);
      session.status = 'ABORTED';
      this.receiverSessions.delete(fromPeerId);
      if (this.onTransferAborted) this.onTransferAborted(fromPeerId);
    }, CHUNK_WATCHDOG_MS);
  }

  // ─────────────────────────────────────────
  // Message Handlers (Sender Side)
  // ─────────────────────────────────────────
  onAcceptTransfer(fromPeerId) {
    const session = this.senderSessions.get(fromPeerId);
    if (!session || session.isExecuting || session.status !== 'PROPOSED') return;
    session.status = 'STREAMING';
    this.executeSendFiles(fromPeerId, session.files);
  }

  onRejectTransfer(fromPeerId) {
    this.senderSessions.delete(fromPeerId);
    if (this.onRejected) this.onRejected(fromPeerId);
  }

  // ─────────────────────────────────────────
  // Public: Receiver Actions
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

  // ─────────────────────────────────────────
  // Public: Sender Actions
  // ─────────────────────────────────────────
  cancelProposedSend(targetPeerId) {
    const conn = this.connections.get(targetPeerId);
    if (conn?.open) {
      try { conn.send(JSON.stringify({ type: 'cancel_proposed_transfer' })); } catch (_) {}
    }
    const session = this.senderSessions.get(targetPeerId);
    if (session) session.abortController.aborted = true;
    this.senderSessions.delete(targetPeerId);
  }

  async sendFilesToPeer(targetPeerId, fileList) {
    if (!fileList || fileList.length === 0) return;

    const session = makeSenderSession(fileList);
    this.senderSessions.set(targetPeerId, session);

    const payload = JSON.stringify({
      type:        'propose_transfer',
      transferId:  Date.now() + Math.random(),
      senderName:  this.myDeviceName,
      totalFiles:  fileList.length,
      fileName:    fileList[0]?.name || 'Fájl',
      fileNames:   Array.from(fileList).slice(0, 10).map(f => f.name),
    });

    let conn = this.connections.get(targetPeerId);

    if (conn?.open) {
      try {
        conn.send(payload);
        return; // Sent once, exit immediately to prevent duplicate proposals!
      } catch (_) {
        this.connections.delete(targetPeerId);
      }
    }

    // If socket not ready yet, connect and wait until open
    this.connectToSlot(targetPeerId);
    for (let i = 0; i < 30; i++) {
      const curSession = this.senderSessions.get(targetPeerId);
      if (!curSession || curSession.abortController.aborted) return; // Cancelled by user!
      await new Promise(r => setTimeout(r, 100));
      conn = this.connections.get(targetPeerId);
      if (conn?.open) {
        try {
          conn.send(payload);
          return; // Sent once, exit loop immediately!
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

    // Get raw DataChannel once – safe across PeerJS versions
    const dc = getRawDataChannel(conn);
    if (dc && dc.bufferedAmountLowThreshold !== undefined) {
      dc.bufferedAmountLowThreshold = LOW_WATERMARK;
    }

    // Use the chunk size optimal for the receiver's platform
    const receiverFamily = this.onlineDevices.get(targetPeerId)?.deviceFamily || 'desktop';
    const chunkSize      = getChunkSizeFor(receiverFamily);

    for (let i = 0; i < fileList.length; i++) {
      const current = this.senderSessions.get(targetPeerId);
      if (!current || current.status !== 'STREAMING' || current.abortController.aborted) break;
      if (!conn.open) break;

      await this.streamFile(conn, dc, session.abortController, fileList[i], i + 1, fileList.length, chunkSize);
    }

    this.senderSessions.delete(targetPeerId);
  }

  async streamFile(conn, dc, abortController, file, currentIndex, totalFiles, chunkSize = CHUNK_SIZE) {
    if (abortController.aborted || !conn.open) return;

    // 1. Send file header
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
      abortController.aborted = true;
      return;
    }

    const startTime = Date.now();
    let offset      = 0;

    // 2. Stream binary chunks with event-driven backpressure
    while (offset < file.size) {
      if (abortController.aborted || !conn.open) return;

      // Wait for buffer to drain before sending next chunk (event-driven, not polling)
      if (dc && dc.bufferedAmount > HIGH_WATERMARK) {
        try {
          await waitForDrain(dc, abortController);
        } catch {
          return; // aborted
        }
      }

      if (abortController.aborted || !conn.open) return;

      // Read next slice
      let chunkBuffer;
      try {
        chunkBuffer = await readSlice(file, offset, CHUNK_SIZE);
      } catch (e) {
        console.error('[Peer] FileReader error, aborting transfer:', e);
        abortController.aborted = true;
        return;
      }

      if (abortController.aborted || !conn.open) return;

      // Send binary chunk
      try {
        conn.send(chunkBuffer);
      } catch (e) {
        console.error('[Peer] DataChannel send error:', e);
        abortController.aborted = true;
        return;
      }

      offset += chunkBuffer.byteLength;

      // Emit sender-side progress
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
          progress, speed, eta,
          currentIndex, totalFiles,
        });
      }
    }

    // 3. Send end signal with exact byte count so receiver can validate completeness
    if (!abortController.aborted && conn.open) {
      try {
        conn.send(JSON.stringify({ type: 'end', name: file.name, totalBytes: file.size }));
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────
  // Public: Teardown
  // ─────────────────────────────────────────
  destroy() {
    this.isDestroyed = true;
    if (this.probeTimer) clearInterval(this.probeTimer);

    // Abort all active sender transfers
    for (const session of this.senderSessions.values()) {
      session.abortController.aborted = true;
    }

    // Clear all receiver watchdog timers
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
