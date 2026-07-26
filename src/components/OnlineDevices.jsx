import React from 'react';
import { Smartphone, Monitor, CheckCircle2, Send, Users, XCircle, Clock } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function OnlineDevices({
  lang,
  myId,
  peerList,
  hasFilesSelected,
  pendingSendPeers,
  onSendToPeer,
  onSendToAll,
  onCancelSendToPeer
}) {
  const t = translations[lang];

  const getDeviceIcon = (deviceInfo) => {
    if (deviceInfo && (deviceInfo.includes('iPhone') || deviceInfo.includes('Android') || deviceInfo.includes('iPad'))) {
      return <Smartphone className="w-5 h-5 text-indigo-400" />;
    }
    return <Monitor className="w-5 h-5 text-cyan-400" />;
  };

  const otherPeers = peerList.filter((p) => !p.isSelf);

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-indigo-500/30">
      
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-base sm:text-lg font-extrabold text-white">
            {t.onlineDevicesTitle} ({peerList.length})
          </h3>
        </div>

        {/* Send to All Button (Shows if 2+ other devices exist and files are queued) */}
        {hasFilesSelected && otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-indigo-400/40"
          >
            <Users className="w-4 h-4" />
            <span>{t.sendToAllDevices}</span>
          </button>
        )}
      </div>

      {/* Online Devices List */}
      <div className="flex flex-col gap-3">
        {peerList.map((device) => {
          const isPending = pendingSendPeers && pendingSendPeers.has(device.id);

          return (
            <div
              key={device.id}
              className={`w-full p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                device.isSelf
                  ? 'bg-slate-900/40 border-white/5 opacity-80'
                  : isPending
                  ? 'bg-indigo-500/15 border-indigo-500/50 shadow-lg'
                  : 'bg-slate-900/90 border-indigo-500/20 hover:border-indigo-400/60 shadow-md'
              }`}
            >
              {/* Clean Device Info (Without ID Subtitle) */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                  {getDeviceIcon(device.deviceInfo)}
                </div>
                <div className="flex items-center gap-2.5 truncate">
                  <p className="text-sm font-extrabold text-white truncate">
                    {device.deviceInfo}
                  </p>
                  {device.isSelf && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded-md border border-indigo-500/30 shrink-0">
                      {t.thisDevice}
                    </span>
                  )}
                </div>
              </div>

              {/* Status / Action Buttons on Device Card */}
              {device.isSelf ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 self-end sm:self-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.readyForReceiving}</span>
                </div>
              ) : isPending ? (
                /* Pending Approval state on THIS specific device card with Cancel button */
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 animate-pulse">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Várakozás elfogadásra...</span>
                  </div>
                  <button
                    onClick={() => onCancelSendToPeer(device.id)}
                    className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-md border border-rose-400/40"
                    title="Visszavonás erről az eszközről"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Visszavonás</span>
                  </button>
                </div>
              ) : (
                /* Send to this device button */
                <button
                  onClick={() => onSendToPeer(device.id)}
                  className={`w-full sm:w-auto py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border ${
                    hasFilesSelected
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-indigo-400/40 hover:opacity-95 shadow-indigo-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{t.sendToThisDevice}</span>
                </button>
              )}

            </div>
          );
        })}

        {otherPeers.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2 italic">
            {t.noOtherDevices}
          </p>
        )}
      </div>

    </div>
  );
}
