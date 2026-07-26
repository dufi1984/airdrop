import React, { useEffect, useRef, useState } from 'react';
import { Share2, Download, Film, FileText, CheckCircle2, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function ReceivedFiles({ lang, receivedFiles, onClearReceived }) {
  const t = translations[lang];
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (receivedFiles && receivedFiles.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [receivedFiles]);

  if (!receivedFiles || receivedFiles.length === 0) return null;

  const handleSaveOrDownloadAll = async () => {
    const fileList = receivedFiles.map((item) => item.file);

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: fileList })) {
      try {
        await navigator.share({
          files: fileList,
          title: `Airdrop Media (${receivedFiles.length} fájl)`,
          text: 'Fájlok mentése a galériába az Airdrop alkalmazással',
        });
        return;
      } catch (err) {
        console.log('User cancelled Web Share API:', err);
      }
    }

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
          className="w-14 h-14 object-cover rounded-xl border border-white/10"
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
              {t.receivedPackageTitle} ({receivedFiles.length})
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
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          {isMobile
            ? 'Koppints a gombra a kapott fotók/videók 1-kattintásos mentéséhez a mobilod Képgalériájába!'
            : 'Kattints a gombra az összes fogadott fájl letöltéséhez a géped Letöltések mappájába!'}
        </span>
      </p>

      {/* Main Action Button */}
      <button
        onClick={handleSaveOrDownloadAll}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all border border-emerald-400/40"
      >
        {isMobile ? <Share2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
        <span>
          {isMobile
            ? `Mentés mindet a Galériába (${receivedFiles.length})`
            : `Mindet Letöltése a gépre (${receivedFiles.length})`}
        </span>
      </button>

      {/* Collapsible Gallery Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
        >
          <span>{isExpanded ? t.hidePhotos : t.viewPhotos} ({receivedFiles.length})</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Thumbnails */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {receivedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/90 border border-white/10"
            >
              {getMediaPreview(item)}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-100 truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {formatBytes(item.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
