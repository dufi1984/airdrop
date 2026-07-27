import React from 'react';
import { Smartphone, Monitor, Tablet, Send, X, Wifi } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function OnlineDevices({
  lang,
  myId,
  peerList,
  hasFilesSelected,
  pendingSendPeers,
  onSendToPeer,
  onSendToAll,
  onCancelSendToPeer,
}) {
  const t = translations[lang];

  // Helper to pick normalized device icon
  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'iPhone':
      case 'Android telefon':
        return <Smartphone className="w-5 h-5 text-zinc-100" />;
      case 'iPad':
      case 'Android tablet':
        return <Tablet className="w-5 h-5 text-zinc-100" />;
      case 'MacBook / Mac':
      case 'Windows PC':
      case 'Linux PC':
        return <Monitor className="w-5 h-5 text-zinc-100" />;
      default:
        return <Smartphone className="w-5 h-5 text-zinc-100" />;
    }
  };

  const otherPeers = peerList.filter((p) => !p.isSelf);
  const myDevice = peerList.find((p) => p.isSelf);

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-6 border border-zinc-700/80 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
          {t.onlineDevicesTitle}
        </h2>

        {/* Send to All Button */}
        {otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            disabled={!hasFilesSelected}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              hasFilesSelected
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 cursor-pointer active:scale-95'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Vertical Stack of Uniform Device Cards */}
      <div className="flex flex-col gap-3">
        
        {/* 1. Self Device Card */}
        {myDevice && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/90 border border-zinc-600/80 shadow-md">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0">
                {getDeviceIcon(myDevice.deviceType)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-100 truncate">
                    {myDevice.deviceType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                    Ez az eszköz
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  {t.readyForReceiving}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Other Online Devices Cards */}
        {otherPeers.map((peer) => {
          const isPending = pendingSendPeers.has(peer.id);

          return (
            <div
              key={peer.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all shadow-md ${
                isPending
                  ? 'bg-blue-950/40 border-blue-500/60'
                  : 'bg-zinc-950/90 border-zinc-600/80 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0">
                  {getDeviceIcon(peer.deviceType)}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-zinc-100 truncate block">
                    {peer.deviceType}
                  </span>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span>Online</span>
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isPending ? (
                  <button
                    onClick={() => onCancelSendToPeer(peer.id)}
                    className="py-2 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Küldés visszavonása"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Mégse</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSendToPeer(peer.id)}
                    disabled={!hasFilesSelected}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                      hasFilesSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 cursor-pointer active:scale-95'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Küldés</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
