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
      return <Smartphone className="w-4.5 h-4.5 text-white/90" />;
    }
    if (/iPad|Tablet/i.test(typeStr)) {
      return <Tablet className="w-4.5 h-4.5 text-white/90" />;
    }
    if (/Mac|Windows|Linux|PC|Monitor/i.test(typeStr)) {
      return <Monitor className="w-4.5 h-4.5 text-white/90" />;
    }
    return <Smartphone className="w-4.5 h-4.5 text-white/90" />;
  };

  const otherPeers = (peerList || []).filter((p) => !p.isSelf);
  const myDevice = (peerList || []).find((p) => p.isSelf);
  const myDeviceName = myDevice?.deviceType || myDevice?.deviceInfo || myDevice?.name || detectDeviceName();

  return (
    <div className="w-full bg-[#1f1f1f] rounded-2xl p-4 flex flex-col gap-3.5 border border-[#303030] shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white/90 tracking-tight">
          {t.onlineDevicesTitle}
        </h2>

        {/* Send to All Button */}
        {otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            disabled={!hasFilesSelected}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              hasFilesSelected
                ? 'bg-[#1677ff] hover:bg-[#4096ff] active:bg-[#0958d9] text-white shadow-sm cursor-pointer active:scale-95'
                : 'bg-[#262626] text-white/25 border border-[#303030] cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Vertical Stack of Uniform Device Cards */}
      <div className="flex flex-col gap-2.5">
        
        {/* 1. Self Device Card */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141414] border border-[#303030] shadow-sm">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-[#1f1f1f] border border-[#303030] flex items-center justify-center shrink-0">
              {getDeviceIcon(myDeviceName)}
            </div>
            <span className="text-sm font-semibold text-white/90 truncate tracking-wide">
              {myDeviceName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-[#52c41a]/10 text-[#52c41a] border border-[#52c41a]/30 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#52c41a]" />
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
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-sm ${
                isPending
                  ? 'bg-[#1677ff]/10 border-[#1677ff]/40'
                  : 'bg-[#141414] border-[#303030] hover:border-[#424242]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-[#1f1f1f] border border-[#303030] flex items-center justify-center shrink-0">
                  {getDeviceIcon(peerDeviceName)}
                </div>
                <span className="text-sm font-semibold text-white/90 truncate tracking-wide">
                  {peerDeviceName}
                </span>
              </div>

              {/* Right Side: Action Button */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isPending ? (
                  <button
                    onClick={() => onCancelSendToPeer(peer.id)}
                    className="py-1.5 px-3 rounded-lg bg-[#ff4d4f]/10 hover:bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/30 text-xs font-medium transition-all cursor-pointer"
                  >
                    Küldés visszavonása
                  </button>
                ) : (
                  <button
                    onClick={() => onSendToPeer(peer.id)}
                    disabled={!hasFilesSelected}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      hasFilesSelected
                        ? 'bg-[#1677ff] hover:bg-[#4096ff] active:bg-[#0958d9] text-white shadow-sm cursor-pointer active:scale-95'
                        : 'bg-[#262626] text-white/25 border border-[#303030] cursor-not-allowed opacity-60'
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
