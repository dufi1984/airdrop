import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import OnlineDevices from './components/OnlineDevices';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import QrModal from './components/QrModal';
import IncomingPromptModal from './components/IncomingPromptModal';
import LogModal from './components/LogModal';

import { peerNetworkService } from './services/peerNetworkService';
import { platform } from './platform';
import { Heart } from 'lucide-react';
import { translations } from './i18n/translations';

// ── Globális AudioContext és Dupla Blip értesítő hang ────────────────────
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playDoubleBlip() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      [0, 0.18].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.13);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.13);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => play()).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    // Hang nem elérhető – csendben figyelmen kívül hagyjuk
  }
}

export default function App() {
  const [lang] = useState('hu');
  const [isConnected, setIsConnected] = useState(false);
  const [peerList, setPeerList] = useState([]);
  
  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);
  const [pendingSendPeers, setPendingSendPeers] = useState(new Set());
  const [autoSavedFiles, setAutoSavedFiles] = useState(new Set()); // names of files already auto-downloaded

  const [showQrModal, setShowQrModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [incomingPrompt, setIncomingPrompt] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = translations[lang];

  // Preserve file queue state in window object to prevent PWA background reloads
  useEffect(() => {
    window.__airdrop_has_files_queued = filesToSend.length > 0;
    window.__airdrop_has_received_files = receivedFiles.length > 0;
  }, [filesToSend, receivedFiles]);

  // Pre-unlock AudioContext on first user interaction anywhere on the page
  useEffect(() => {
    const unlockAudio = () => {
      getAudioContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('click', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Initialize clean network service with predictable event handlers
  useEffect(() => {
    peerNetworkService.init(
      (status) => setIsConnected(status),
      (updatedDevices) => setPeerList(updatedDevices),
      (progressData) => {
        setTransferState(progressData);
        setPendingSendPeers(new Set());

        // Clear filesToSend queue ONLY when transfer actually starts streaming!
        if (progressData && progressData.direction === 'send' && progressData.progress > 0) {
          setFilesToSend([]);
        }

        if (progressData && progressData.direction === 'send' && progressData.progress >= 100) {
          setTransferState(null);
          setAlertMsg('Sikeres átvitel! A csomag megérkezett.');
          setTimeout(() => setAlertMsg(null), 4000);
        }
      },
      (receivedFileData) => {
        // Reset list on first file of a new batch
        if (receivedFileData.currentIndex === 1) {
          setReceivedFiles([receivedFileData]);
          setAutoSavedFiles(new Set());
        } else {
          setReceivedFiles((prev) => [...prev, receivedFileData]);
        }

        // Android & PC: auto-download each file the moment it fully arrives
        if (platform.autoDownloads) {
          platform.saveFile(receivedFileData)
            .then(() => setAutoSavedFiles((prev) => new Set([...prev, receivedFileData.name])))
            .catch((e) => console.warn('Auto-download failed:', e));
        }

        if (receivedFileData.currentIndex >= receivedFileData.totalFiles) {
          setTransferState(null);
        }
      },
      (promptInfo) => {
        setShowQrModal(false);
        setIncomingPrompt(promptInfo);
        playDoubleBlip();
      },
      (rejectedPeerId) => {
        setTransferState(null);
        setPendingSendPeers((prev) => {
          const next = new Set(prev instanceof Set ? prev : []);
          next.delete(rejectedPeerId);
          return next;
        });
        setAlertMsg('A fogadó fél elutasította az átvitelt.');
        setTimeout(() => setAlertMsg(null), 3500);
      },
      (cancelledPeerId) => {
        setIncomingPrompt(null);
        setAlertMsg('A küldő visszavonta az átvitelt.');
        setTimeout(() => setAlertMsg(null), 3000);
      },
      (abortedPeerId) => {
        // Clear stuck progress bar immediately when sender refreshes/disconnects mid-stream!
        setTransferState(null);
        setPendingSendPeers(new Set());
        setAlertMsg('A kapcsolat megszakadt (a másik fél kilépett vagy frissített).');
        setTimeout(() => setAlertMsg(null), 4000);
      }
    );

    return () => {
      peerNetworkService.destroy();
    };
  }, []);

  // Force cache-busting hard page reload
  const handleForceAppReload = async () => {
    if (filesToSend.length > 0) {
      const confirmReload = window.confirm('A kijelölt fájlok törlődnek. Biztosan frissíted?');
      if (!confirmReload) return;
    }

    setIsRefreshing(true);

    try {
      // 1. Unregister any active Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      // 2. Clear all cache storage
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }

    // 3. Hard navigate with cache-busting query parameter
    const cleanUrl = window.location.origin + window.location.pathname + '?r=' + Date.now();
    window.location.replace(cleanUrl);

    // 4. Safety reset after 2.5s if browser delays navigation
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2500);
  };

  const handleAcceptIncoming = () => {
    if (incomingPrompt) {
      setReceivedFiles([]);
      setTransferState(null);
      peerNetworkService.acceptIncoming(incomingPrompt.fromPeerId);
      setIncomingPrompt(null);
    }
  };

  const handleRejectIncoming = () => {
    if (incomingPrompt) {
      peerNetworkService.rejectIncoming(incomingPrompt.fromPeerId);
      setIncomingPrompt(null);
    }
  };

  const handleCancelProposedSend = (targetPeerId) => {
    try {
      peerNetworkService.cancelProposedSend(targetPeerId);
    } catch (err) {
      console.warn('Cancel send error:', err);
    }
    setPendingSendPeers((prev) => {
      const next = new Set(prev instanceof Set ? prev : []);
      next.delete(targetPeerId);
      return next;
    });
    setAlertMsg('Küldés visszavonva.');
    setTimeout(() => setAlertMsg(null), 2500);
  };

  const handleSendToPeer = async (targetPeerId) => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    setPendingSendPeers((prev) => new Set(prev).add(targetPeerId));
    await peerNetworkService.sendFilesToPeer(targetPeerId, filesToSend);
  };

  const handleSendToAll = async () => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    const allPeerIds = peerList.filter((p) => !p.isSelf).map((p) => p.id);
    setPendingSendPeers(new Set(allPeerIds));
    await peerNetworkService.sendFilesToAll(filesToSend);
  };

  const handleClearReceived = () => {
    setReceivedFiles([]);
    setAutoSavedFiles(new Set());
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#1677ff] selection:text-white pb-[env(safe-area-inset-bottom,0px)] relative bg-[#050505]">
      
      {/* Header Bar */}
      <Header
        isConnected={isConnected}
        onOpenQr={() => setShowQrModal(true)}
        onOpenLogs={() => setShowLogModal(true)}
        onForceReload={handleForceAppReload}
        isRefreshing={isRefreshing}
      />

      {/* Ant Design Floating Toast Notification Banner */}
      {alertMsg && (
        <div className="fixed top-16 inset-x-0 mx-auto w-max z-[9990] max-w-[90vw] px-3.5 py-2 rounded-lg bg-[#141414] border border-white/[0.12] text-white/90 text-xs font-medium text-center shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1677ff]" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Main Container with Responsive Ordering */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3.5 py-4 sm:px-6 flex flex-col gap-3.5">

        {/* 1. File Selector Component */}
        <FilePicker
          lang={lang}
          files={filesToSend}
          setFiles={setFilesToSend}
        />

        {/* 2. Online Devices Component */}
        <OnlineDevices
          lang={lang}
          myId={peerNetworkService.myId}
          peerList={peerList}
          hasFilesSelected={filesToSend.length > 0}
          pendingSendPeers={pendingSendPeers}
          onSendToPeer={handleSendToPeer}
          onSendToAll={handleSendToAll}
          onCancelSendToPeer={handleCancelProposedSend}
        />

        {/* 3. Active Transfer Progress Banner */}
        {transferState && (
          <TransferProgress lang={lang} transferState={transferState} />
        )}

        {/* 4. Received Grouped Package Section */}
        <ReceivedFiles
          lang={lang}
          receivedFiles={receivedFiles}
          transferState={transferState}
          autoSavedFiles={autoSavedFiles}
          onClearReceived={handleClearReceived}
        />

      </main>

      {/* Footer with Subtle Heart Icon and Ant Design Glow Beam */}
      <footer className="w-full border-t border-white/[0.08] py-3.5 text-center text-xs text-white/35 flex items-center justify-center gap-1.5 font-normal relative overflow-hidden">
        <div className="ant-footer-beam" />
        <span>Airdrop by Dufi</span>
        <Heart className="w-3 h-3 text-[#ff4d4f] fill-[#ff4d4f]/60" />
      </footer>

      {/* Incoming Prompt Modal Prompt */}
      {incomingPrompt && (
        <IncomingPromptModal
          lang={lang}
          incomingInfo={incomingPrompt}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
        />
      )}

      {/* QR Code Share Modal */}
      {showQrModal && (
        <QrModal
          lang={lang}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Diagnostic System Log Modal */}
      {showLogModal && (
        <LogModal
          onClose={() => setShowLogModal(false)}
        />
      )}

    </div>
  );
}
