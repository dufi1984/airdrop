import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilePicker from './components/FilePicker';
import QrPairing from './components/QrPairing';
import QrScannerModal from './components/QrScannerModal';
import TransferProgress from './components/TransferProgress';
import ReceivedFiles from './components/ReceivedFiles';
import PeerSelector from './components/PeerSelector';
import ServerConfigModal from './components/ServerConfigModal';

import { socketService } from './services/socketService';
import { webRtcService } from './services/webRtcService';
import { generateRoomId } from './utils/formatters';
import { QrCode, X, Sparkles, Heart } from 'lucide-react';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState('hu');
  const [roomId, setRoomId] = useState('');
  const [roomUrl, setRoomUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // List of connected peers in room: [{ id, deviceInfo }]
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState('all');

  const [filesToSend, setFilesToSend] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferState, setTransferState] = useState(null);

  const [showScanner, setShowScanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);

  const t = translations[lang];

  // Helper to parse or generate room ID from window URL hash
  const getOrCreateRoomId = useCallback(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('room=')) {
      const id = hash.split('room=')[1].split('&')[0];
      if (id) return id;
    }
    const newId = generateRoomId();
    window.location.hash = `room=${newId}`;
    return newId;
  }, []);

  // Initialize WebRTC callbacks
  useEffect(() => {
    webRtcService.setCallbacks(
      (peerId, state) => {
        console.log(`Peer state update [${peerId}]:`, state);
      },
      (progressData) => setTransferState(progressData),
      (receivedFileData) => {
        setReceivedFiles((prev) => [receivedFileData, ...prev]);
        setTransferState(null);
      }
    );
  }, []);

  // Initialize room & socket connection
  useEffect(() => {
    const id = getOrCreateRoomId();
    setRoomId(id);

    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}#room=${id}`;
    setRoomUrl(fullUrl);

    socketService.on('onConnect', () => setIsConnected(true));
    socketService.on('onDisconnect', () => setIsConnected(false));

    socketService.on('onRoomPeers', (existingPeers) => {
      setConnectedPeers(existingPeers);
      existingPeers.forEach((p) => {
        webRtcService.createPeer(p.id, true);
      });
    });

    socketService.on('onPeerJoined', (peerData) => {
      console.log('👤 Connected to remote peer:', peerData);
      setConnectedPeers((prev) => {
        if (prev.some((p) => p.id === peerData.id)) return prev;
        return [...prev, peerData];
      });
      setShowWaitingModal(false);
      webRtcService.createPeer(peerData.id, true);
    });

    socketService.on('onSignal', (data) => {
      setShowWaitingModal(false);
      webRtcService.handleSignal(data.from, data.signal);
    });

    socketService.on('onPeerLeft', (peerId) => {
      setConnectedPeers((prev) => prev.filter((p) => p.id !== peerId));
      webRtcService.removePeer(peerId);
    });

    socketService.joinRoom(id);

    return () => {
      webRtcService.closeAll();
      socketService.disconnect();
    };
  }, [getOrCreateRoomId]);

  // Leave room and generate a fresh new room ID
  const handleNewRoom = () => {
    webRtcService.closeAll();
    setConnectedPeers([]);
    setFilesToSend([]);
    setReceivedFiles([]);
    setTransferState(null);
    setShowWaitingModal(false);

    const newId = generateRoomId();
    window.location.hash = `room=${newId}`;
    setRoomId(newId);

    const baseUrl = window.location.origin + window.location.pathname;
    setRoomUrl(`${baseUrl}#room=${newId}`);

    socketService.joinRoom(newId);
  };

  const isPeerConnected = connectedPeers.length > 0;

  // Trigger file sending over WebRTC (targeting specific device or all)
  const handleStartSend = async () => {
    if (filesToSend.length === 0) return;
    if (!isPeerConnected) {
      setShowWaitingModal(true);
      return;
    }

    if (selectedTargetId === 'all') {
      const allIds = connectedPeers.map((p) => p.id);
      await webRtcService.sendFilesToAll(allIds, filesToSend);
    } else {
      await webRtcService.sendFilesToPeer(selectedTargetId, filesToSend);
    }

    setFilesToSend([]);
    setTransferState(null);
  };

  // Handle camera QR scanner result
  const handleScanSuccess = (decodedText) => {
    setShowScanner(false);
    if (decodedText.includes('room=')) {
      const id = decodedText.split('room=')[1].split('&')[0];
      if (id) {
        window.location.hash = `room=${id}`;
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Header Bar */}
      <Header
        lang={lang}
        setLang={setLang}
        roomId={roomId}
        isPeerConnected={isPeerConnected}
        onNewRoom={handleNewRoom}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 flex flex-col gap-8">
        
        {/* Banner */}
        <div className="w-full text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Közvetlen P2P Fájlküldés Eszközök Között</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Gyors Fájlmegosztás Böngészőből
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            1. Válaszd ki a fájlokat &bull; 2. Olvasd be a QR-kódot a másik eszközzel (pl. iPad/telefon) &bull; 3. Válassz cél-eszközt & Küldés!
          </p>
        </div>

        {/* Multi-Peer Target Selector (Displayed when 1 or more devices are in room) */}
        {connectedPeers.length > 0 && (
          <PeerSelector
            lang={lang}
            peers={connectedPeers}
            selectedTargetId={selectedTargetId}
            setSelectedTargetId={setSelectedTargetId}
          />
        )}

        {/* Active Transfer Progress Banner */}
        {transferState && (
          <TransferProgress lang={lang} transferState={transferState} />
        )}

        {/* Grid Layout: File Picker & QR Pairing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* File Selector Component */}
          <FilePicker
            lang={lang}
            files={filesToSend}
            setFiles={setFilesToSend}
            onStartSend={handleStartSend}
            isPeerConnected={isPeerConnected}
          />

          {/* QR Pairing Component */}
          <QrPairing
            lang={lang}
            roomUrl={roomUrl}
            onOpenScanner={() => setShowScanner(true)}
          />

        </div>

        {/* Received Files Section */}
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

      {/* Waiting for Peer Modal Guidance */}
      {showWaitingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 flex flex-col gap-4 border border-indigo-500/40 text-center relative shadow-2xl">
            <button
              onClick={() => setShowWaitingModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-1 animate-pulse">
              <QrCode className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white">
              {t.waitingToConnectTitle}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t.waitingToConnectDesc}
            </p>

            <div className="p-2 bg-white rounded-2xl mx-auto border-4 border-indigo-500/30">
              <QrPairing lang={lang} roomUrl={roomUrl} onOpenScanner={() => setShowScanner(true)} />
            </div>

            <button
              onClick={() => setShowWaitingModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold mt-2"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      {showScanner && (
        <QrScannerModal
          lang={lang}
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}

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
