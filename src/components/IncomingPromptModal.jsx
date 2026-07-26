import React, { useState } from 'react';
import { ArrowDownCircle, CheckCircle2, XCircle, Package, Maximize2, Minimize2 } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function IncomingPromptModal({ lang, incomingInfo, onAccept, onReject }) {
  const t = translations[lang];
  const [isExpanded, setIsExpanded] = useState(false);

  if (!incomingInfo) return null;

  const { senderName, totalFiles, fileName } = incomingInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 flex flex-col items-center text-center gap-5 border border-emerald-500/50 shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Animated Incoming Call Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 border-2 border-emerald-400/60 flex items-center justify-center animate-pulse shadow-xl shadow-emerald-500/30 shrink-0">
          <ArrowDownCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-bounce" />
        </div>

        {/* Header Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Bejövő Átvitel
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Tappable / Expandable Item Count Box */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 hover:border-indigo-400 cursor-pointer flex flex-col gap-2.5 transition-all shadow-md active:scale-[0.99] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="text-sm font-extrabold text-white">
                📦 {totalFiles || 1} elem érkezik
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-bold bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/30">
              {isExpanded ? (
                <>
                  <span>Összecsukás</span>
                  <Minimize2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Kibontás</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </>
              )}
            </div>
          </div>

          {/* Item details (Single or Expandable Max 4-5 Items Scrollable) */}
          {isExpanded ? (
            <div className="w-full max-h-36 overflow-y-auto pt-2 border-t border-white/10 flex flex-col gap-1.5 text-left text-xs text-slate-300">
              <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5 truncate font-medium">
                📄 {fileName}
              </div>
              {totalFiles > 1 && (
                <p className="text-[11px] text-slate-400 italic px-1">
                  ...és további {totalFiles - 1} fájl szerepel a csomagban.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 truncate text-left">
              {fileName}
            </p>
          )}
        </div>

        {/* Two Large Phone Call Style Action Buttons (Elfogadás & Elutasítás) */}
        <div className="grid grid-cols-2 gap-3.5 w-full pt-1 shrink-0">
          
          {/* 🔴 ELUTASÍTÁS (Red Button) */}
          <button
            onClick={onReject}
            className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-rose-400/30"
          >
            <XCircle className="w-6 h-6 text-white" />
            <span>ELUTASÍTÁS</span>
          </button>

          {/* 🟢 ELFOGADÁS (Green Button) */}
          <button
            onClick={onAccept}
            className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/40 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>ELFOGADÁS</span>
          </button>

        </div>

      </div>
    </div>
  );
}
