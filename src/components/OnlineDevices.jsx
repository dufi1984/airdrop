import React from 'react';
import { Smartphone, Monitor, Tablet, Send } from 'lucide-react';
import { translations } from '../i18n/translations';
import { detectDeviceName } from '../utils/formatters';

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

  // Defensive fallback for pendingSendPeers Set
  const safePendingSet = pendingSendPeers instanceof Set ? pendingSendPeers : new Set();

  // Helper to pick normalized device icon
  const getDeviceIcon = (deviceType) => {
    const typeStr = String(deviceType || '');
    if (/iPhone|Android telefon|Mobile/i.test(typeStr)) {
      return <Smartphone className="w-5 h-5 text-zinc-100" />;
    }
    if (/iPad|Tablet/i.test(typeStr)) {
      return <Tablet className="w-5 h-5 text-zinc-100" />;
    }
    if (/Mac|Windows|Linux|PC|Monitor/i.test(typeStr)) {
      return <Monitor className="w-5 h-5 text-zinc-100" />;
    }
    return <Smartphone className="w-5 h-5 text-zinc-100" />;
  };

  const otherPeers = (peerList || []).filter((p) => !p.isSelf);
  const myDevice = (peerList || []).find((p) => p.isSelf);
  const myDeviceName = myDevice?.deviceType || myDevice?.deviceInfo || myDevice?.name || detectDeviceName();

  return (
    <div className="w-full bg-zinc-900/90 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 border border-zinc-800 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
          {t.onlineDevicesTitle}
        </h2>

        {/* Send to All Button (Tall 48px Height) */}
        {otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            disabled={!hasFilesSelected}
            className={`h-12 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              hasFilesSelected
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 cursor-pointer active:scale-95 shadow-md'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Vertical Stack of Uniform Device Cards */}
      <div className="flex flex-col gap-3">
        
        {/* 1. Self Device Card */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              {getDeviceIcon(myDeviceName)}
            </div>
            <span className="text-sm font-extrabold text-zinc-100 truncate tracking-wide">
              {myDeviceName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              Ez az eszköz
            </span>
          </div>
        </div>

        {/* 2. Other Online Devices Cards */}
        {otherPeers.map((peer) => {
          const isPending = safePendingSet.has(peer.id);
          const peerDeviceName = peer.deviceType || peer.deviceInfo || peer.name || 'Online eszköz';

          return (
            <div
              key={peer.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
                isPending
                  ? 'bg-blue-950/30 border-blue-500/40'
                  : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  {getDeviceIcon(peerDeviceName)}
                </div>
                <span className="text-sm font-extrabold text-zinc-100 truncate tracking-wide">
                  {peerDeviceName}
                </span>
              </div>

              {/* Right Side: Taller Action Buttons (48px Height for Tapping) */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isPending ? (
                  <button
                    onClick={() => onCancelSendToPeer(peer.id)}
                    className="h-12 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center"
                  >
                    Küldés visszavonása
                  </button>
                ) : (
                  <button
                    onClick={() => onSendToPeer(peer.id)}
                    disabled={!hasFilesSelected}
                    className={`h-12 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 shadow-md ${
                      hasFilesSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 cursor-pointer active:scale-95'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Send className="w-4 h-4" />
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
