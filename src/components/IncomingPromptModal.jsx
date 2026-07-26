import React, { useState } from 'react';
import { CheckCircle2, XCircle, Package, Maximize2, Minimize2 } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function IncomingPromptModal({ lang, incomingInfo, onAccept, onReject }) {
  const t = translations[lang];
  const [isExpanded, setIsExpanded] = useState(false);

  if (!incomingInfo) return null;

  const { senderName, totalFiles, fileName, fileNames } = incomingInfo;
  const listToRender = fileNames && fileNames.length > 0 ? fileNames : [fileName];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 flex flex-col items-center text-center gap-5 border border-blue-500/50 shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-400/40 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Package className="w-8 h-8 text-blue-400" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">
            Bejövő Átvitel
          </span>
          <h2 className="text-lg sm:text-xl font-black text-zinc-100">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Box Container */}
        <div className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-zinc-700 flex flex-col gap-3 shadow-md select-none relative">
          
          {/* Top Row */}
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-extrabold text-zinc-100">
              {totalFiles || 1} elem érkezik
            </p>

            {/* Clickable Trigger */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-[11px] font-bold transition-colors bg-blue-500/20 px-2.5 py-1 rounded-xl border border-blue-500/40 active:scale-95 cursor-pointer"
            >
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
            </button>
          </div>

          {/* Expanded List */}
          {isExpanded && (
            <div className="w-full max-h-48 overflow-y-auto pt-3 border-t border-white/10 flex flex-col gap-1.5 text-left text-xs text-zinc-300 pr-1 touch-pan-y">
              {listToRender.map((name, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-zinc-800 border border-white/10 truncate font-medium flex items-center gap-2 text-zinc-200">
                  <span className="text-blue-400 font-mono text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Two Large Action Buttons */}
        <div className="grid grid-cols-2 gap-3.5 w-full pt-1 shrink-0">
          
          {/* 🔴 ELUTASÍTÁS */}
          <button
            onClick={onReject}
            className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-rose-400/30"
          >
            <XCircle className="w-6 h-6 text-white" />
            <span>ELUTASÍTÁS</span>
          </button>

          {/* 🟢 ELFOGADÁS (Material Blue/Cyan Gradient) */}
          <button
            onClick={onAccept}
            className="w-full py-4 px-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-blue-500/40 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-blue-400/40"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>ELFOGADÁS</span>
          </button>

        </div>

      </div>
    </div>
  );
}
