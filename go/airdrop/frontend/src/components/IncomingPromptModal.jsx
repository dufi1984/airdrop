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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#1f1f1f] rounded-2xl p-6 flex flex-col items-center text-center gap-5 border border-[#303030] shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Top Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#1677ff]/10 border border-[#1677ff]/30 flex items-center justify-center shrink-0">
          <Package className="w-7 h-7 text-[#1677ff]" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-xs font-bold text-[#1677ff] uppercase tracking-wider">
            Bejövő fájlcsomag
          </span>
          <h2 className="text-lg font-bold text-white/90">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Box Container */}
        <div className="w-full p-3.5 rounded-xl bg-[#141414] border border-[#303030] flex flex-col gap-2.5 shadow-sm text-left">
          
          <div className="flex items-center justify-between w-full">
            <p className="text-xs font-bold text-white/88">
              {totalFiles || 1} fájl érkezik
            </p>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-[#1677ff] hover:text-[#4096ff] text-xs font-medium transition-colors cursor-pointer"
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
            <div className="w-full max-h-40 overflow-y-auto pt-2 border-t border-[#303030] flex flex-col gap-1.5 text-xs text-white/80 pr-1">
              {listToRender.map((name, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[#1f1f1f] border border-[#303030] truncate font-medium flex items-center gap-2 text-white/88">
                  <span className="text-[#1677ff] font-mono text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Action Buttons (Taller 56px Height & Larger Text) */}
        <div className="grid grid-cols-2 gap-3 w-full shrink-0">
          
          {/* Elutasítás (56px height, text-base) */}
          <button
            onClick={onReject}
            className="h-14 w-full py-3 px-4 rounded-xl bg-[#ff4d4f]/10 hover:bg-[#ff4d4f]/20 text-[#ff4d4f] font-bold text-sm sm:text-base border border-[#ff4d4f]/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <XCircle className="w-5 h-5 text-[#ff4d4f] shrink-0" />
            <span>Elutasítás</span>
          </button>

          {/* Elfogadás (56px height, text-base) */}
          <button
            onClick={onAccept}
            className="h-14 w-full py-3 px-4 rounded-xl bg-[#1677ff] hover:bg-[#4096ff] active:bg-[#0958d9] text-white font-bold text-sm sm:text-base shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>Elfogadás</span>
          </button>

        </div>

      </div>
    </div>
  );
}
