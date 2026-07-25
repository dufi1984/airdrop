import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import OnlineDevices from './components/OnlineDevices';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import ServerConfigModal from './components/ServerConfigModal';

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
  const [alertMsg, setAlertMsg] = useState(null);

  const t = translations[lang];

  // Initialize instant PeerJS cloud network
  useEffect(() => {
    peerNetworkService.init(
      (status) => setIsConnected(status),
      (updatedDevices) => setPeerList(updatedDevices),
      (progressData) => setTransferState(progressData),
      (receivedFileData) => {
        setReceivedFiles((prev) => [receivedFileData, ...prev]);
        setTransferState(null);
      }
    );

    return () => {
      peerNetworkService.destroy();
    };
  }, []);

  // Send files to specific target peer
  const handleSendToPeer = async (targetPeerId) => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    await peerNetworkService.sendFilesToPeer(targetPeerId, filesToSend);
    setFilesToSend([]);
    setTransferState(null);
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
    setTransferState(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Header Bar */}
      <Header
        lang={lang}
        setLang={setLang}
        isConnected={isConnected}
        onlineCount={peerList.length}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 flex flex-col gap-6">
        
        {/* Warning Toast */}
        {alertMsg && (
          <div className="w-full p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold text-center animate-bounce">
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
          onStartSend={() => {}}
          isPeerConnected={peerList.length > 1}
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

        {/* 3. Received Files Section */}
        <ReceivedFiles lang={lang} receivedFiles={receivedFiles} />

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <span>Airdrop P2P WebApp &bull; Ingyenes nyílt forráskódú szoftver</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </div>
        <p className="text-[11px] text-slate-600">
          GitHub: <a href="https://github.com/dufi1984/airdrop" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">dufi1984/airdrop</a>
        </p>
      </footer>

      {/* Server Config Modal */}
      {showSettings && (
        <ServerConfigModal
          lang={lang}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}
