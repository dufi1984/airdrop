import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, FileText, CheckCircle2, Sparkles, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function ReceivedFiles({ lang, receivedFiles, transferState, onClearReceived }) {
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

  const isReceivingActive = transferState && transferState.direction === 'receive';
  const totalExpectedFiles = transferState?.totalFiles || uniqueReceivedFiles.length;
  const isComplete = !isReceivingActive && uniqueReceivedFiles.length >= totalExpectedFiles;

  // Main Action: Save ALL files to Photo Gallery on Mobile (via Native Share Panel) or Download on PC
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

  const handleSaveOrDownloadAll = async () => {
    if (!uniqueReceivedFiles || uniqueReceivedFiles.length === 0) return;
    const fileList = uniqueReceivedFiles.map((item) => item.file);

    // 1. On Mobile (iPhone / Android): Open Native Bottom Panel to Save to Photo Gallery
    if (isMobile) {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: fileList })) {
        try {
          await navigator.share({
            files: fileList,
            title: `Airdrop Media (${uniqueReceivedFiles.length} fájl)`,
            text: 'Fájlok mentése a galériába az Airdrop alkalmazással',
          });
        } catch (err) {
          console.log('User cancelled native share panel:', err);
        }
      }
      return;
    }

    // 2. Direct Download ONLY for Desktop PC
    handleDirectDownloadAll();
  };

  // Single Item Action: Save 1 file to Photo Gallery on Mobile or Download on PC
  const handleSaveSingleItem = async (item) => {
    if (isMobile) {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [item.file] })) {
        try {
          await navigator.share({
            files: [item.file],
            title: item.name,
            text: 'Kép mentése a galériába',
          });
        } catch (err) {
          console.log('User cancelled single item share:', err);
        }
      }
      return;
    }

    // Direct Download ONLY for Desktop PC
    const link = document.createElement('a');
    link.href = item.blobUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-scroll and trigger batch download ONCE on PC only when ALL files in the package have completely arrived!
  useEffect(() => {
    if (uniqueReceivedFiles.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const batchId = uniqueReceivedFiles.map((f) => f.name).join('_');
      
      if (!isMobile && isComplete && autoTriggeredBatchIdRef.current !== batchId) {
        autoTriggeredBatchIdRef.current = batchId;
        const timer = setTimeout(() => {
          handleDirectDownloadAll();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [uniqueReceivedFiles, isMobile, isComplete]);

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
      
      {/* Header with Live Fraction Progress Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
            {isReceivingActive ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-zinc-100">
                {t.receivedPackageTitle}
              </h3>
              <span className="text-xs sm:text-sm font-extrabold font-mono text-blue-400">
                ({uniqueReceivedFiles.length}/{totalExpectedFiles})
              </span>
            </div>
            <p className="text-xs text-emerald-300 font-medium">
              {isReceivingActive
                ? `Fájlok érkezése folyamatban... (${uniqueReceivedFiles.length}/${totalExpectedFiles})`
                : 'Sikeresen megérkezett a csomag!'}
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
          {isMobile
            ? 'Koppints a kék gombra a mentéshez, vagy töltsd le a fájlokat egyesével az alábbi 📥 ikonokkal!'
            : '⚡ A letöltés elindult a Letöltések mappádba! Ha nem indult el mind, kattints az alábbi gombra!'}
        </span>
      </p>

      {/* Main Action Button (Sentence Case Typography) */}
      <button
        onClick={handleSaveOrDownloadAll}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all border border-blue-400/40 animate-pulse"
      >
        <Download className="w-5 h-5" />
        <span>
          {isMobile
            ? `Mentés mindet a galériába (${uniqueReceivedFiles.length}/${totalExpectedFiles})`
            : `Minden letöltése a gépre (${uniqueReceivedFiles.length}/${totalExpectedFiles})`}
        </span>
      </button>

      {/* Collapsible Gallery Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
        >
          <span>{isExpanded ? t.hidePhotos : t.viewPhotos} ({uniqueReceivedFiles.length}/{totalExpectedFiles})</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Thumbnails */}
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

              {/* ALWAYS Visible Download Icon Button */}
              <button
                onClick={() => handleSaveSingleItem(item)}
                className="p-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-500/50 text-blue-200 border border-blue-400/60 transition-all shrink-0 flex items-center justify-center shadow-md active:scale-95 cursor-pointer"
                title={isMobile ? "Mentés a galériába" : "Fájl letöltése külön"}
              >
                <Download className="w-4.5 h-4.5 text-blue-300" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
