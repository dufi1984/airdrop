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
      <div className="w-full max-w-sm bg-[#141414] rounded-2xl p-6 flex flex-col items-center text-center gap-5 border border-white/[0.12] shadow-2xl relative max-h-[90vh] overflow-hidden">
        
        {/* Top Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1677ff]/10 border border-[#1677ff]/30 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-[#1677ff]" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-[11px] font-medium text-[#1677ff] bg-[#112544] border border-[#163c70] px-2 py-0.5 rounded w-max mx-auto uppercase tracking-wider">
            Bejövő fájlcsomag
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-white/90">
            {senderName || 'Egy online eszköz'} küldeni szeretne!
          </h2>
        </div>

        {/* Middle Box Container */}
        <div className="w-full p-3 rounded-xl bg-[#1c1c1c] border border-white/[0.08] flex flex-col gap-2 shadow-sm text-left">
          
          <div className="flex items-center justify-between w-full">
            <p className="text-xs font-semibold text-white/85">
              {totalFiles || 1} fájl érkezik
            </p>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[#1677ff] hover:text-[#4096ff] text-xs font-medium transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>Összecsukás</span>
                  <Minimize2 className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>Bővebben</span>
                  <Maximize2 className="w-3 h-3" />
                </>
              )}
            </button>
          </div>

          {/* Expanded File List */}
          {isExpanded && (
            <div className="w-full max-h-40 overflow-y-auto pt-2 border-t border-white/[0.08] flex flex-col gap-1.5 text-xs text-white/80 pr-1">
              {listToRender.map((name, idx) => (
                <div key={idx} className="p-2 rounded-md bg-[#141414] border border-white/[0.08] truncate font-medium flex items-center gap-2 text-white/85">
                  <span className="text-[#1677ff] font-mono text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Action Buttons (Ant Design Styled Buttons) */}
        <div className="grid grid-cols-2 gap-3 w-full shrink-0">
          
          {/* Elutasítás (Danger Style) */}
          <button
            onClick={onReject}
            className="h-12 w-full py-2.5 px-4 ant-btn-danger font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <XCircle className="w-4 h-4 text-[#ff4d4f] shrink-0" />
            <span>Elutasítás</span>
          </button>

          {/* Elfogadás (Primary Style) */}
          <button
            onClick={onAccept}
            className="h-12 w-full py-2.5 px-4 ant-btn-primary font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
          >
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>Elfogadás</span>
          </button>

        </div>

      </div>
    </div>
  );
}
