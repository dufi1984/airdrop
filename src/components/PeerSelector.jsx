import React from 'react';
import { Smartphone, Tablet, Laptop, Users, CheckCircle2 } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function PeerSelector({ lang, peers, selectedTargetId, setSelectedTargetId }) {
  const t = translations[lang];

  if (!peers || peers.length === 0) return null;

  const getDeviceIcon = (deviceInfo = '') => {
    const info = deviceInfo.toLowerCase();
    if (info.includes('ipad') || info.includes('tablet')) {
      return <Tablet className="w-5 h-5 text-indigo-400" />;
    }
    if (info.includes('phone') || info.includes('telefon') || info.includes('iphone') || info.includes('android')) {
      return <Smartphone className="w-5 h-5 text-cyan-400" />;
    }
    return <Laptop className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4 border border-indigo-500/30">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Csatlakozott Eszközök a Szobában ({peers.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Válaszd ki, melyik eszköznek szeretnéd küldeni a fájlokat:
            </p>
          </div>
        </div>
      </div>

      {/* Peer Radio List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        
        {/* Option: Send to ALL */}
        <button
          type="button"
          onClick={() => setSelectedTargetId('all')}
          className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all ${
            selectedTargetId === 'all'
              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Mindegyik csatlakozott eszköznek</span>
          </div>
          {selectedTargetId === 'all' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        {/* Individual Devices */}
        {peers.map((peer) => {
          const isSelected = selectedTargetId === peer.id;
          return (
            <button
              key={peer.id}
              type="button"
              onClick={() => setSelectedTargetId(peer.id)}
              className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {getDeviceIcon(peer.deviceInfo)}
                <span className="truncate">{peer.deviceInfo} ({peer.id.substring(0, 5)})</span>
              </div>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </button>
          );
        })}

      </div>

    </div>
  );
}
