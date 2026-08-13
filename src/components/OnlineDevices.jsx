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
      return <Smartphone className="w-4 h-4 text-white/80" />;
    }
    if (/iPad|Tablet/i.test(typeStr)) {
      return <Tablet className="w-4 h-4 text-white/80" />;
    }
    if (/Mac|Windows|Linux|PC|Monitor/i.test(typeStr)) {
      return <Monitor className="w-4 h-4 text-white/80" />;
    }
    return <Smartphone className="w-4 h-4 text-white/80" />;
  };

  const otherPeers = (peerList || []).filter((p) => !p.isSelf);
  const myDevice = (peerList || []).find((p) => p.isSelf);
  const myDeviceName = myDevice?.deviceType || myDevice?.deviceInfo || myDevice?.name || detectDeviceName();

  return (
    <div className="w-full bg-[#111111] rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 border border-white/[0.08] shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-semibold text-white/90 tracking-tight">
          {t.onlineDevicesTitle}
        </h2>

        {/* Send to All Button */}
        {otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            disabled={!hasFilesSelected}
            className={`py-1 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              hasFilesSelected
                ? 'ant-btn-primary cursor-pointer active:scale-95'
                : 'bg-white/[0.04] text-white/25 border border-white/[0.08] cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Vertical Stack of Uniform Device Cards */}
      <div className="flex flex-col gap-2">
        
        {/* 1. Self Device Card */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] border border-white/[0.08] flex items-center justify-center shrink-0">
              {getDeviceIcon(myDeviceName)}
            </div>
            <span className="text-xs sm:text-sm font-medium text-white/90 truncate">
              {myDeviceName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-[#132a13] text-[#52c41a] border border-[#235323] text-[11px] font-medium flex items-center gap-1.5">
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
              className={`flex items-center justify-between p-3 rounded-xl border transition-all shadow-sm ${
                isPending
                  ? 'bg-[#112544]/60 border-[#163c70]'
                  : 'bg-[#171717] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-[#111111] border border-white/[0.08] flex items-center justify-center shrink-0">
                  {getDeviceIcon(peerDeviceName)}
                </div>
                <span className="text-xs sm:text-sm font-medium text-white/90 truncate">
                  {peerDeviceName}
                </span>
              </div>

              {/* Right Side: Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                {isPending ? (
                  <button
                    onClick={() => onCancelSendToPeer(peer.id)}
                    className="ant-btn-danger py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Visszavonás
                  </button>
                ) : (
                  <button
                    onClick={() => onSendToPeer(peer.id)}
                    disabled={!hasFilesSelected}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      hasFilesSelected
                        ? 'ant-btn-primary cursor-pointer active:scale-95'
                        : 'bg-white/[0.04] text-white/25 border border-white/[0.08] cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Send className="w-3 h-3" />
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
