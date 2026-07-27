import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import OnlineDevices from './components/OnlineDevices';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import ServerConfigModal from './components/ServerConfigModal';
import QrModal from './components/QrModal';
import IncomingPromptModal from './components/IncomingPromptModal';

import { peerNetworkService } from './services/peerNetworkService';
import { Heart, RotateCw } from 'lucide-react';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState('hu');
  const [isConnected, setIsConnected] = useState(false);
  const [peerList, setPeerList] = useState([]);
  
  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);
  const [pendingSendPeers, setPendingSendPeers] = useState(new Set());

  const [showSettings, setShowSettings] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [incomingPrompt, setIncomingPrompt] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = translations[lang];

  // Preserve file queue state in window object
  useEffect(() => {
    window.__airdrop_has_files_queued = filesToSend.length > 0;
  }, [filesToSend]);

  // Initialize instant PeerJS cloud network with phone call style incoming prompt callback
  useEffect(() => {
    peerNetworkService.init(
      (status) => setIsConnected(status),
      (updatedDevices) => setPeerList(updatedDevices),
      (progressData) => {
        setTransferState(progressData);
        setPendingSendPeers(new Set());
        if (progressData && progressData.direction === 'send' && progressData.progress >= 100) {
          setTimeout(() => {
            setTransferState(null);
            setAlertMsg('🟢 Sikeres átvitel! A csomag megérkezett.');
            setTimeout(() => setAlertMsg(null), 4000);
          }, 1200);
        }
      },
      (receivedFileData) => {
        // Add file to current batch
        setReceivedFiles((prev) => [...prev, receivedFileData]);
        setTransferState(null);
      },
      (promptInfo) => {
        setIncomingPrompt(promptInfo);
      },
      (rejectedPeerId) => {
        setTransferState(null);
        setPendingSendPeers((prev) => {
          const next = new Set(prev);
          next.delete(rejectedPeerId);
          return next;
        });
        setAlertMsg('🔴 A fogadó fél elutasította az átvitelt.');
        setTimeout(() => setAlertMsg(null), 3500);
      },
      (cancelledPeerId) => {
        setIncomingPrompt(null);
        setAlertMsg('ℹ️ A küldő visszavonta az átvitelt.');
        setTimeout(() => setAlertMsg(null), 3000);
      }
    );

    return () => {
      peerNetworkService.destroy();
    };
  }, []);

  // Force cache-busting reload button action for PWA standalone app mode
  const handleForceAppReload = () => {
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

  // Accept incoming transfer prompt -> reset received files for fresh new package batch
  const handleAcceptIncoming = () => {
    if (incomingPrompt) {
      setReceivedFiles([]); // Clear previous batch so new batch starts fresh!
      peerNetworkService.acceptIncoming(incomingPrompt.fromPeerId);
      setIncomingPrompt(null);
    }
  };

  // Reject incoming transfer prompt
  const handleRejectIncoming = () => {
    if (incomingPrompt) {
      peerNetworkService.rejectIncoming(incomingPrompt.fromPeerId);
      setIncomingPrompt(null);
    }
  };

  // Sender cancels proposed transfer to a specific target peer before receiver accepts
  const handleCancelProposedSend = (targetPeerId) => {
    peerNetworkService.cancelProposedSend(targetPeerId);
    setPendingSendPeers((prev) => {
      const next = new Set(prev);
      next.delete(targetPeerId);
      return next;
    });
    setAlertMsg('Visszavontad a küldést.');
    setTimeout(() => setAlertMsg(null), 2500);
  };

  // Send files to specific target peer
  const handleSendToPeer = async (targetPeerId) => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    setPendingSendPeers((prev) => new Set(prev).add(targetPeerId));
    await peerNetworkService.sendFilesToPeer(targetPeerId, filesToSend);
    setFilesToSend([]);
  };

  // Send files to ALL online peers
  const handleSendToAll = async () => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    const allPeerIds = peerList.filter((p) => !p.isSelf).map((p) => p.id);
    setPendingSendPeers(new Set(allPeerIds));
    await peerNetworkService.sendFilesToAll(filesToSend);
    setFilesToSend([]);
  };

  const handleClearReceived = () => {
    setReceivedFiles([]);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Header Bar */}
      <Header
        lang={lang}
        isConnected={isConnected}
        onlineCount={peerList.length}
        onOpenQr={() => setShowQrModal(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 flex flex-col gap-6">
        
        {/* Warning Toast */}
        {alertMsg && (
          <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-bounce shadow-xl">
            {alertMsg}
          </div>
        )}

        {/* Active Transfer Progress Banner */}
        {transferState && (
          <TransferProgress lang={lang} transferState={transferState} />
        )}

        {/* 1. File Selector Component (Top) */}
        <FilePicker
          lang={lang}
          files={filesToSend}
          setFiles={setFilesToSend}
        />

        {/* 2. Online Devices Vertical List */}
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

        {/* Clean In-Place Force App Reload Button */}
        <div className="w-full flex justify-center -mt-2">
          <button
            onClick={handleForceAppReload}
            className="py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 text-xs font-semibold border border-white/10 flex items-center gap-2 transition-all active:scale-95 shadow-md"
            title="Oldal frissítése"
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>App Frissítése</span>
          </button>
        </div>

        {/* 3. Received Grouped Package Section */}
        <ReceivedFiles
          lang={lang}
          receivedFiles={receivedFiles}
          onClearReceived={handleClearReceived}
        />

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
        <span>Airdrop by Dufi</span>
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
      </footer>

      {/* Phone Call Style Incoming Transfer Modal Prompt */}
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

      {/* Server & Language Settings Modal */}
      {showSettings && (
        <ServerConfigModal
          lang={lang}
          setLang={setLang}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}
