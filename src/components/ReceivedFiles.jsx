import React from 'react';
import { Share2, Download, Image, Film, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function ReceivedFiles({ lang, receivedFiles }) {
  const t = translations[lang];

  if (!receivedFiles || receivedFiles.length === 0) return null;

  const handleShareToGallery = async (item) => {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [item.file] })) {
      try {
        await navigator.share({
          files: [item.file],
          title: item.name,
          text: 'Fájl mentése a galériába az Airdrop P2P segítségével',
        });
      } catch (err) {
        console.log('User cancelled or error during Web Share API:', err);
      }
    } else {
      // Fallback trigger standard download
      handleDownload(item);
    }
  };

  const handleDownload = (item) => {
    const a = document.createElement('a');
    a.href = item.blobUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        <div className="w-16 h-16 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center">
          <Film className="w-8 h-8 text-cyan-400" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 rounded-xl bg-amber-900/40 border border-amber-500/30 flex items-center justify-center">
        <FileText className="w-8 h-8 text-amber-400" />
      </div>
    );
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-emerald-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            {t.receivedFilesTitle} ({receivedFiles.length})
          </h3>
        </div>
      </div>

      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{t.autoShareNotice}</span>
      </p>

      {/* Received Items List */}
      <div className="flex flex-col gap-3">
        {receivedFiles.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 gap-3"
          >
            {/* Preview & Info */}
            <div className="flex items-center gap-3 min-w-0">
              {getMediaPreview(item)}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatBytes(item.size)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Web Share / Save to Gallery Button */}
              {navigator.share && (
                <button
                  onClick={() => handleShareToGallery(item)}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-1.5 transition-all active:scale-95"
                  title={t.saveToGallery}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.saveToGallery}</span>
                </button>
              )}

              {/* Direct Download Button */}
              <button
                onClick={() => handleDownload(item)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all active:scale-95"
                title={t.downloadFile}
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{t.downloadFile}</span>
              </button>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
