import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import OnlineDevices from './components/OnlineDevices';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import QrModal from './components/QrModal';
import IncomingPromptModal from './components/IncomingPromptModal';

import { peerNetworkService } from './services/peerNetworkService';
import { Heart } from 'lucide-react';
import { translations } from './i18n/translations';

export default function App() {
  const [lang] = useState('hu');
  const [isConnected, setIsConnected] = useState(false);
  const [peerList, setPeerList] = useState([]);
  
  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);
  const [pendingSendPeers, setPendingSendPeers] = useState(new Set());

  const [showQrModal, setShowQrModal] = useState(false);
  const [incomingPrompt, setIncomingPrompt] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = translations[lang];

  // Preserve file queue state in window object to prevent PWA background reloads
  useEffect(() => {
    window.__airdrop_has_files_queued = filesToSend.length > 0;
    window.__airdrop_has_received_files = receivedFiles.length > 0;
  }, [filesToSend, receivedFiles]);

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
        if (receivedFileData.currentIndex === 1) {
          setReceivedFiles([receivedFileData]);
        } else {
          setReceivedFiles((prev) => [...prev, receivedFileData]);
        }
        
        if (receivedFileData.currentIndex >= receivedFileData.totalFiles) {
          setTransferState(null);
        }
      },
      (promptInfo) => {
        setShowQrModal(false);
        setIncomingPrompt(promptInfo);
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
      }
    );

    return () => {
      peerNetworkService.destroy();
    };
  }, []);

  // Force cache-busting reload button action
  const handleForceAppReload = () => {
    if (isRefreshing) {
      setIsRefreshing(false);
      window.location.reload(true);
      return;
    }

    if (filesToSend.length > 0) {
      const confirmReload = window.confirm('A kijelölt fájlok törlődnek.');
      if (!confirmReload) return;
    }

    setIsRefreshing(true);
    
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    setTimeout(() => {
      window.location.reload(true);
    }, 200);
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
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white pb-[env(safe-area-inset-bottom,0px)] relative">
      
      {/* Header Bar */}
      <Header
        isConnected={isConnected}
        onOpenQr={() => setShowQrModal(true)}
        onForceReload={handleForceAppReload}
        isRefreshing={isRefreshing}
      />

      {/* Floating Perfect Viewport Center Toast Banner */}
      {alertMsg && (
        <div className="fixed top-16 inset-x-0 mx-auto w-max z-[9990] max-w-[90vw] px-5 py-2.5 rounded-2xl bg-zinc-900/95 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold text-center shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
          {alertMsg}
        </div>
      )}

      {/* Main Container with Responsive Ordering */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 py-4 sm:px-6 flex flex-col gap-3.5">

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
          onClearReceived={handleClearReceived}
        />

      </main>

      {/* Footer with Subtle Small Heart Icon */}
      <footer className="w-full border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
        <span>Airdrop by Dufi</span>
        <Heart className="w-3 h-3 text-rose-500/80 fill-rose-500/80" />
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

    </div>
  );
}
