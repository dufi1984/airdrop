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
      <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 flex flex-col items-center text-center gap-5 border border-indigo-500/40 shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Top Icon: Clean Line Package Icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Package className="w-8 h-8 text-indigo-400" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
            Bejövő Átvitel
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Box Container */}
        <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 flex flex-col gap-3 shadow-md select-none relative">
          
          {/* Top Row: Clean Text + Only Top Right Expand/Collapse Trigger is Clickable */}
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-extrabold text-white">
              {totalFiles || 1} elem érkezik
            </p>

            {/* Clickable Expand/Collapse Trigger */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-[11px] font-bold transition-colors bg-indigo-500/15 px-2.5 py-1 rounded-xl border border-indigo-500/30 active:scale-95 cursor-pointer"
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

          {/* Expanded Content View: Native Touch Scrollable List for all 6, 8, 10 Items */}
          {isExpanded && (
            <div className="w-full max-h-48 overflow-y-auto pt-3 border-t border-white/10 flex flex-col gap-1.5 text-left text-xs text-slate-300 pr-1 touch-pan-y">
              {listToRender.map((name, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5 truncate font-medium flex items-center gap-2">
                  <span className="text-indigo-400 font-mono text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
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
            className="w-full py-4 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/40 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>ELFOGADÁS</span>
          </button>

        </div>

      </div>
    </div>
  );
}
