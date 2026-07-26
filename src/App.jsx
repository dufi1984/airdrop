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
import { Heart } from 'lucide-react';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState('hu');
  const [isConnected, setIsConnected] = useState(false);
  const [peerList, setPeerList] = useState([]);
  
  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [incomingPrompt, setIncomingPrompt] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);

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
        // Auto-clear sender progress bar when reaching 100%
        if (progressData && progressData.direction === 'send' && progressData.progress >= 100) {
          setTimeout(() => {
            setTransferState(null);
            setAlertMsg('🟢 Sikeres átvitel! A csomag megérkezett.');
            setTimeout(() => setAlertMsg(null), 4000);
          }, 1200);
        }
      },
      (receivedFileData) => {
        setReceivedFiles((prev) => [receivedFileData, ...prev]);
        setTransferState(null);
      },
      (promptInfo) => {
        setIncomingPrompt(promptInfo);
      },
      (rejectedPeerId) => {
        setTransferState(null);
        setAlertMsg('🔴 A fogadó fél elutasította az átvitelt.');
        setTimeout(() => setAlertMsg(null), 3500);
      }
    );

    return () => {
      peerNetworkService.destroy();
    };
  }, []);

  // Accept incoming transfer prompt
  const handleAcceptIncoming = () => {
    if (incomingPrompt) {
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

  // Send files to specific target peer
  const handleSendToPeer = async (targetPeerId) => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
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

        {/* 2. Online Devices Vertical List (Underneath - Tap to Send!) */}
        <OnlineDevices
          lang={lang}
          myId={peerNetworkService.myId}
          peerList={peerList}
          hasFilesSelected={filesToSend.length > 0}
          onSendToPeer={handleSendToPeer}
          onSendToAll={handleSendToAll}
        />

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
