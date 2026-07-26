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
      return <Smartphone className="w-5 h-5 text-teal-400" />;
    }
    return <Monitor className="w-5 h-5 text-cyan-400" />;
  };

  const otherPeers = peerList.filter((p) => !p.isSelf);

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-zinc-700/60">
      
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-base sm:text-lg font-extrabold text-zinc-100">
            {t.onlineDevicesTitle} ({peerList.length})
          </h3>
        </div>

        {/* Send to All Button */}
        {hasFilesSelected && otherPeers.length > 1 && (
          <button
            onClick={onSendToAll}
            className="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-teal-400/40"
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
                  ? 'bg-zinc-900/40 border-white/5 opacity-80'
                  : isPending
                  ? 'bg-teal-500/20 border-teal-500/60 shadow-lg'
                  : 'bg-zinc-900/90 border-zinc-700/60 hover:border-teal-400/60 shadow-md'
              }`}
            >
              {/* Clean Device Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 shrink-0">
                  {getDeviceIcon(device.deviceInfo)}
                </div>
                <div className="flex items-center gap-2.5 truncate">
                  <p className="text-sm font-extrabold text-zinc-100 truncate">
                    {device.deviceInfo}
                  </p>
                  {device.isSelf && (
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 font-extrabold px-2 py-0.5 rounded-md border border-teal-500/40 shrink-0">
                      {t.thisDevice}
                    </span>
                  )}
                </div>
              </div>

              {/* Status / Action Buttons */}
              {device.isSelf ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30 self-end sm:self-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.readyForReceiving}</span>
                </div>
              ) : isPending ? (
                /* Pending Approval state */
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40 animate-pulse">
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
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-400/50 hover:opacity-95 shadow-teal-500/20 animate-pulse'
                      : 'bg-zinc-800 text-zinc-300 border-white/15 hover:text-white hover:bg-zinc-700'
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
          <p className="text-xs text-zinc-400 text-center py-2 italic">
            {t.noOtherDevices}
          </p>
        )}
      </div>

    </div>
  );
}
