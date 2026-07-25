import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import OnlineDevices from './components/OnlineDevices';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import ServerConfigModal from './components/ServerConfigModal';

import { socketService } from './services/socketService';
import { webRtcService } from './services/webRtcService';
import { Sparkles, Heart } from 'lucide-react';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState('hu');
  const [myId, setMyId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peerList, setPeerList] = useState([]);
  
  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const t = translations[lang];

  // Initialize WebRTC callbacks
  useEffect(() => {
    webRtcService.setCallbacks(
      (peerId, state) => console.log(`Peer state [${peerId}]:`, state),
      (progressData) => setTransferState(progressData),
      (receivedFileData) => {
        setReceivedFiles((prev) => [receivedFileData, ...prev]);
        setTransferState(null);
      }
    );
  }, []);

  // Initialize auto-discovery socket network
  useEffect(() => {
    socketService.on('onConnect', (socketId) => {
      setIsConnected(true);
      setMyId(socketId);
    });

    socketService.on('onDisconnect', () => {
      setIsConnected(false);
      setMyId(null);
    });

    socketService.on('onOnlineDevicesUpdated', (updatedList) => {
      setPeerList(updatedList);
      updatedList.forEach((peer) => {
        if (peer.id !== socketService.myId) {
          webRtcService.createPeer(peer.id, true);
        }
      });
    });

    socketService.on('onSignal', (data) => {
      webRtcService.handleSignal(data.from, data.signal);
    });

    socketService.connect();

    return () => {
      webRtcService.closeAll();
      socketService.disconnect();
    };
  }, []);

  // Send files to specific target peer (Option 1)
  const handleSendToPeer = async (targetPeerId) => {
    if (filesToSend.length === 0) {
      setAlertMsg(t.selectFilesWarning);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    await webRtcService.sendFilesToPeer(targetPeerId, filesToSend);
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
    const otherIds = peerList.filter((p) => p.id !== myId).map((p) => p.id);
    await webRtcService.sendFilesToAll(otherIds, filesToSend);
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
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 flex flex-col gap-8">
        
        {/* Banner */}
        <div className="w-full text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Közvetlen P2P Fájlküldés Eszközök Között</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Gyors Fájlmegosztás Böngészőből
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            1. Válaszd ki a fájlokat &bull; 2. Koppints az egyik Online Eszközre a küldéshez!
          </p>
        </div>

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

        {/* 1. File Selector Component (First!) */}
        <FilePicker
          lang={lang}
          files={filesToSend}
          setFiles={setFilesToSend}
          onStartSend={() => {}}
          isPeerConnected={peerList.length > 1}
        />

        {/* 2. Online Devices Vertical List (Second - Tap to Send!) */}
        <OnlineDevices
          lang={lang}
          myId={myId}
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
