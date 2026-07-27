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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-900/95 rounded-2xl p-6 flex flex-col items-center text-center gap-5 border border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Top Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Package className="w-7 h-7 text-blue-400" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Bejövő fájlcsomag
          </span>
          <h2 className="text-lg font-bold text-zinc-100">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Box Container */}
        <div className="w-full p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-2.5 shadow-sm text-left">
          
          <div className="flex items-center justify-between w-full">
            <p className="text-xs font-bold text-zinc-200">
              {totalFiles || 1} fájl érkezik
            </p>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>Összecsukás</span>
                  <Minimize2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Bővebben</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Expanded File List */}
          {isExpanded && (
            <div className="w-full max-h-40 overflow-y-auto pt-2 border-t border-zinc-800 flex flex-col gap-1.5 text-xs text-zinc-300 pr-1">
              {listToRender.map((name, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 truncate font-medium flex items-center gap-2 text-zinc-200">
                  <span className="text-blue-400 font-mono text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full shrink-0">
          
          {/* Elutasítás */}
          <button
            onClick={onReject}
            className="w-full py-3 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Elutasítás</span>
          </button>

          {/* Elfogadás */}
          <button
            onClick={onAccept}
            className="w-full py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs border border-blue-500/50 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Elfogadás</span>
          </button>

        </div>

      </div>
    </div>
  );
}
