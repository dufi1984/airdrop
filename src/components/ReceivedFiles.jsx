import React, { useEffect, useRef } from 'react';
import { Share2, Download, Film, FileText, CheckCircle2, Sparkles, X } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function ReceivedFiles({ lang, receivedFiles, onClearReceived }) {
  const t = translations[lang];
  const containerRef = useRef(null);

  // Auto-scroll to received files section on new file arrival
  useEffect(() => {
    if (receivedFiles && receivedFiles.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [receivedFiles]);

  if (!receivedFiles || receivedFiles.length === 0) return null;

  // Batch Save All to Gallery via Web Share API
  const handleShareAllToGallery = async () => {
    const fileList = receivedFiles.map((item) => item.file);

    if (navigator.share && navigator.canShare && navigator.canShare({ files: fileList })) {
      try {
        await navigator.share({
          files: fileList,
          title: `Airdrop Media (${receivedFiles.length} fájl)`,
          text: 'Fájlok mentése a galériába az Airdrop P2P alkalmazással',
        });
      } catch (err) {
        console.log('User cancelled Web Share API:', err);
      }
    } else {
      // Fallback batch download
      handleDownloadAll();
    }
  };

  // Download all files sequentially
  const handleDownloadAll = () => {
    receivedFiles.forEach((item, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.blobUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 250);
    });
  };

  const getMediaPreview = (item) => {
    if (item.mimeType.startsWith('image/')) {
      return (
        <img
          src={item.blobUrl}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-xl border border-white/10"
        />
      );
    }
    if (item.mimeType.startsWith('video/')) {
      return (
        <div className="w-16 h-16 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Film className="w-7 h-7 text-cyan-400" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 rounded-xl bg-amber-900/40 border border-amber-500/30 flex items-center justify-center shrink-0">
        <FileText className="w-7 h-7 text-amber-400" />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-emerald-500/40 shadow-2xl animate-fade-in">
      
      {/* Header with Reject X button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {t.receivedPackageTitle} ({receivedFiles.length} {t.filesSelected})
            </h3>
            <p className="text-xs text-emerald-300 font-medium">
              Sikeresen megérkezett a csomag!
            </p>
          </div>
        </div>

        {/* Reject / Dismiss X Button */}
        <button
          onClick={onClearReceived}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title={t.rejectPackage}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">{t.rejectPackage}</span>
        </button>
      </div>

      <p className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{t.autoShareNotice}</span>
      </p>

      {/* Main Batch Action Buttons (Save All / Download All) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        
        {/* Batch Save to Gallery Button */}
        <button
          onClick={handleShareAllToGallery}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>{t.saveAllToGallery} ({receivedFiles.length})</span>
        </button>

        {/* Download All Button */}
        <button
          onClick={handleDownloadAll}
          className="w-full py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>{t.downloadAll}</span>
        </button>

      </div>

      {/* Received Items Thumbnails Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {receivedFiles.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/5"
          >
            {getMediaPreview(item)}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {item.name}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatBytes(item.size)}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
