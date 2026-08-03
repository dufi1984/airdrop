import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, FileText, CheckCircle2, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';
import { platform } from '../platform';

export default function ReceivedFiles({ lang, receivedFiles, transferState, autoSavedFiles = new Set(), onClearReceived }) {
  const t = translations[lang];
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const uniqueReceivedFiles = React.useMemo(() => {
    if (!receivedFiles) return [];
    const map = new Map();
    receivedFiles.forEach((item) => {
      map.set(item.name + '_' + item.size, item);
    });
    return Array.from(map.values());
  }, [receivedFiles]);

  const isReceivingActive  = transferState?.direction === 'receive';
  const totalExpectedFiles = transferState?.totalFiles || uniqueReceivedFiles.length;
  const isPackageComplete  = !isReceivingActive && uniqueReceivedFiles.length >= totalExpectedFiles;

  // Auto-scroll when new files arrive
  useEffect(() => {
    if (uniqueReceivedFiles.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [uniqueReceivedFiles.length]);

  if (!uniqueReceivedFiles || uniqueReceivedFiles.length === 0) return null;

  const getMediaPreview = (item) => {
    if (item.mimeType.startsWith('image/')) {
      return (
        <img
          src={item.blobUrl}
          alt={item.name}
          className="w-14 h-14 object-cover rounded-xl border border-zinc-700/80 shrink-0"
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

  const getToggleText = () =>
    isExpanded
      ? 'Képek elrejtése'
      : `Képek megtekintése (${uniqueReceivedFiles.length})`;

  return (
    <div ref={containerRef} className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-emerald-500/50 shadow-2xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
            {isReceivingActive
              ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-base sm:text-lg font-bold text-zinc-100">
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

        <button
          onClick={onClearReceived}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-zinc-700/80 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          title={t.rejectPackage}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">{t.rejectPackage}</span>
        </button>
      </div>

      {/*
        iOS only: manual bulk save button appears after the last file arrives.
        Android & Desktop: files are already auto-downloaded one by one as they arrive.
      */}
      {isPackageComplete && !platform.autoDownloads && (
        <button
          onClick={() => platform.saveAllFiles(uniqueReceivedFiles)}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all border border-blue-400/40 cursor-pointer animate-fade-in"
        >
          <Download className="w-5 h-5 text-white" />
          <span>{platform.getSaveLabel(uniqueReceivedFiles.length)}</span>
        </button>
      )}

      {/* Collapsible Gallery Toggle */}
      <div className="w-full pt-3 border-t border-zinc-800/80">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2.5 px-3 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 text-zinc-300 hover:text-white flex items-center justify-between transition-all cursor-pointer min-h-[44px] active:scale-[0.99]"
        >
          <span className="text-xs sm:text-sm font-bold">{getToggleText()}</span>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-zinc-400" />
            : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>
      </div>

      {/* Thumbnails */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {uniqueReceivedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950/90 border border-zinc-700/80 shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getMediaPreview(item)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-100 truncate">{item.name}</p>
                  <p className="text-[11px] text-zinc-400 font-medium">{formatBytes(item.size)}</p>
                </div>
              </div>

              {/*
                Auto-saved (Android/PC): green checkmark.
                Not yet saved: platform.saveFile() button (works for both iOS manual
                save and Android/PC re-download).
              */}
              {autoSavedFiles.has(item.name) ? (
                <div
                  className="p-2.5 rounded-xl bg-emerald-900/40 border border-emerald-500/40 shrink-0 flex items-center justify-center"
                  title="Automatikusan elmentve"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <button
                  onClick={() => platform.saveFile(item)}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500 hover:text-white transition-all shrink-0 flex items-center justify-center shadow-md active:scale-95 cursor-pointer"
                  title={platform.autoDownloads ? 'Letöltés újra' : 'Mentés a galériába'}
                >
                  <Download className="w-4 h-4 text-zinc-100" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
