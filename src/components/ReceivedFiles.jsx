import React, { useEffect, useRef, useState } from 'react';
import { Share2, Download, Film, FileText, CheckCircle2, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function ReceivedFiles({ lang, receivedFiles, onClearReceived }) {
  const t = translations[lang];
  const containerRef = useRef(null);
  const autoTriggeredBatchIdRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Deduplicated list of received files by blobUrl/name
  const uniqueReceivedFiles = React.useMemo(() => {
    if (!receivedFiles) return [];
    const map = new Map();
    receivedFiles.forEach((item) => {
      map.set(item.name + '_' + item.size, item);
    });
    return Array.from(map.values());
  }, [receivedFiles]);

  // Direct Batch Download for ALL devices (Saves straight to Downloads folder)
  const handleDirectDownloadAll = () => {
    if (!uniqueReceivedFiles || uniqueReceivedFiles.length === 0) return;
    uniqueReceivedFiles.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.blobUrl;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 350);
    });
  };

  // Native Share Sheet trigger for iOS / Android
  const handleShareAll = async () => {
    if (!uniqueReceivedFiles || uniqueReceivedFiles.length === 0) return;
    const fileList = uniqueReceivedFiles.map((item) => item.file);

    if (navigator.share && navigator.canShare && navigator.canShare({ files: fileList })) {
      try {
        await navigator.share({
          files: fileList,
          title: `Airdrop Media (${uniqueReceivedFiles.length} fájl)`,
          text: 'Fájlok mentése az Airdrop alkalmazással',
        });
        return;
      } catch (err) {
        console.log('Native share panel cancelled:', err);
      }
    }
    // Fallback to direct download if share fails
    handleDirectDownloadAll();
  };

  // Auto-scroll and trigger batch download ONCE on PC only
  useEffect(() => {
    if (uniqueReceivedFiles.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const batchId = uniqueReceivedFiles.map((f) => f.name).join('_');
      
      if (!isMobile && autoTriggeredBatchIdRef.current !== batchId) {
        autoTriggeredBatchIdRef.current = batchId;
        const timer = setTimeout(() => {
          handleDirectDownloadAll();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [uniqueReceivedFiles, isMobile]);

  if (!uniqueReceivedFiles || uniqueReceivedFiles.length === 0) return null;

  const getMediaPreview = (item) => {
    if (item.mimeType.startsWith('image/')) {
      return (
        <img
          src={item.blobUrl}
          alt={item.name}
          className="w-14 h-14 object-cover rounded-xl border border-white/10 shrink-0"
        />
      );
    }
    if (item.mimeType.startsWith('video/')) {
      return (
        <div className="w-14 h-14 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Film className="w-6 h-6 text-cyan-400" />
        </div>
      );
    }
    return (
      <div className="w-14 h-14 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
        <FileText className="w-6 h-6 text-amber-400" />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-emerald-500/50 shadow-2xl animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-zinc-100">
              {t.receivedPackageTitle} ({uniqueReceivedFiles.length})
            </h3>
            <p className="text-xs text-emerald-300 font-medium">
              Sikeresen megérkezett a csomag!
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClearReceived}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title={t.rejectPackage}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">{t.rejectPackage}</span>
        </button>
      </div>

      {/* Notice Bar */}
      <p className="text-xs text-zinc-300 bg-zinc-900/90 p-3.5 rounded-2xl border border-white/10 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
        <span>
          Kattints a kék Letöltés gombra az összes fájl mentéséhez, vagy töltsd le őket egyesével az alábbi 📥 ikonokkal!
        </span>
      </p>

      {/* Dual Buttons for Mobile (Direct Download + Native Share) */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        {/* Main Direct Download Button */}
        <button
          onClick={handleDirectDownloadAll}
          className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all border border-blue-400/40 animate-pulse"
        >
          <Download className="w-5 h-5" />
          <span>Mindet Letöltése ({uniqueReceivedFiles.length})</span>
        </button>

        {/* Mobile Share Sheet Option */}
        {isMobile && (
          <button
            onClick={handleShareAll}
            className="py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-white/15 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <Share2 className="w-4.5 h-4.5 text-blue-400" />
            <span>Megosztás menü</span>
          </button>
        )}
      </div>

      {/* Collapsible Gallery Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
        >
          <span>{isExpanded ? t.hidePhotos : t.viewPhotos} ({uniqueReceivedFiles.length})</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Thumbnails with Prominent Individual Download Icons */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {uniqueReceivedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getMediaPreview(item)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-zinc-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {formatBytes(item.size)}
                  </p>
                </div>
              </div>

              {/* ALWAYS Visible Prominent Individual File Download Button */}
              <a
                href={item.blobUrl}
                download={item.name}
                className="p-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-500/50 text-blue-200 border border-blue-400/60 transition-all shrink-0 flex items-center justify-center shadow-md active:scale-95"
                title="Fájl letöltése külön"
              >
                <Download className="w-4.5 h-4.5 text-blue-300" />
              </a>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
