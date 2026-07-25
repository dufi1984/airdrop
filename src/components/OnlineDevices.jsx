import React from 'react';
import { Smartphone, Tablet, Laptop, Send, CheckCircle2, Wifi, Sparkles, Users } from 'lucide-react';
import { translations } from '../i18n/translations';
import { detectDeviceName } from '../utils/formatters';

export default function OnlineDevices({
  lang,
  myId,
  peerList,
  hasFilesSelected,
  onSendToPeer,
  onSendToAll
}) {
  const t = translations[lang];
  const myDeviceType = detectDeviceName();

  const otherPeers = peerList.filter((p) => p.id !== myId);

  const getDeviceIcon = (deviceInfo = '') => {
    const info = deviceInfo.toLowerCase();
    if (info.includes('ipad') || info.includes('tablet')) {
      return <Tablet className="w-6 h-6 text-indigo-400" />;
    }
    if (info.includes('phone') || info.includes('telefon') || info.includes('iphone') || info.includes('android')) {
      return <Smartphone className="w-6 h-6 text-cyan-400" />;
    }
    return <Laptop className="w-6 h-6 text-amber-400" />;
  };

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-indigo-500/30">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {t.onlineDevicesTitle} ({peerList.length})
            </h3>
            <p className="text-xs text-slate-400">
              {hasFilesSelected ? t.tapDeviceToSend : t.selectFilesFirst}
            </p>
          </div>
        </div>

        {/* Broadcast to all button */}
        {otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            disabled={!hasFilesSelected}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              hasFilesSelected
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Device Cards Vertical List */}
      <div className="flex flex-col gap-3">
        
        {/* 1. Self Device Card (Always at Top) */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              {getDeviceIcon(myDeviceType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">
                  {myDeviceType}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {t.thisDevice}
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.readyForReceiving}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Other Online Devices */}
        {otherPeers.length > 0 ? (
          otherPeers.map((peer) => (
            <div
              key={peer.id}
              onClick={() => hasFilesSelected && onSendToPeer(peer.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                hasFilesSelected
                  ? 'bg-slate-900/80 border-cyan-500/40 hover:bg-indigo-950/60 hover:border-cyan-400 cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-900/50 border-white/5 opacity-85'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  {getDeviceIcon(peer.deviceInfo)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {peer.deviceInfo}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: #{peer.id.substring(0, 6)} &bull; 🟢 Online
                  </p>
                </div>
              </div>

              {/* Action Button / Indicator */}
              <button
                disabled={!hasFilesSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToPeer(peer.id);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                  hasFilesSelected
                    ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white hover:opacity-90 active:scale-95 shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-400 border border-white/5'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{t.sendToThisDevice}</span>
              </button>
            </div>
          ))
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-center flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
              {t.noOtherDevices}
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
