import React from 'react';
import { ArrowDownCircle, CheckCircle2, XCircle, Package } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function IncomingPromptModal({ lang, incomingInfo, onAccept, onReject }) {
  const t = translations[lang];

  if (!incomingInfo) return null;

  const { senderName, totalFiles, fileName } = incomingInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-6 border border-emerald-500/50 shadow-2xl relative animate-bounce-slow">
        
        {/* Animated Incoming Call Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 border-2 border-emerald-400/60 flex items-center justify-center animate-pulse shadow-xl shadow-emerald-500/30">
          <ArrowDownCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
        </div>

        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Bejövő Átvitel
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Element Count Box (Phone Call Style) */}
        <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-center gap-3">
          <Package className="w-6 h-6 text-indigo-400" />
          <div className="text-left">
            <p className="text-sm font-extrabold text-white">
              📦 {totalFiles || 1} elem érkezik
            </p>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
              {fileName}
            </p>
          </div>
        </div>

        {/* Two Large Phone Call Style Action Buttons (Elfogadás & Elutasítás) */}
        <div className="grid grid-cols-2 gap-4 w-full pt-2">
          
          {/* 🔴 ELUTASÍTÁS (Red Button) */}
          <button
            onClick={onReject}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-rose-400/30"
          >
            <XCircle className="w-6 h-6 text-white" />
            <span>ELUTASÍTÁS</span>
          </button>

          {/* 🟢 ELFOGADÁS (Green Button) */}
          <button
            onClick={onAccept}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/40 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>ELFOGADÁS</span>
          </button>

        </div>

      </div>
    </div>
  );
}
