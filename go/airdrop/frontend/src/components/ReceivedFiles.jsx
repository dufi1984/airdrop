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
          className="w-14 h-14 object-cover rounded-xl border border-[#303030] shrink-0"
        />
      );
    }
    if (item.mimeType.startsWith('video/')) {
      return (
        <div className="w-14 h-14 rounded-xl bg-[#13c2c2]/10 border border-[#13c2c2]/30 flex items-center justify-center shrink-0">
          <Film className="w-6 h-6 text-[#13c2c2]" />
        </div>
      );
    }
    return (
      <div className="w-14 h-14 rounded-xl bg-[#faad14]/10 border border-[#faad14]/30 flex items-center justify-center shrink-0">
        <FileText className="w-6 h-6 text-[#faad14]" />
      </div>
    );
  };

  const getToggleText = () =>
    isExpanded
      ? 'Képek elrejtése'
      : `Képek megtekintése (${uniqueReceivedFiles.length})`;

  return (
    <div ref={containerRef} className="w-full bg-[#1f1f1f] rounded-2xl p-5 sm:p-6 flex flex-col gap-4 border border-[#52c41a]/40 shadow-2xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#52c41a]/10 flex items-center justify-center border border-[#52c41a]/30">
            {isReceivingActive
              ? <Loader2 className="w-5 h-5 text-[#1677ff] animate-spin" />
              : <CheckCircle2 className="w-5 h-5 text-[#52c41a]" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white/90">
                {t.receivedPackageTitle}
              </h3>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#1677ff]">
                ({uniqueReceivedFiles.length}/{totalExpectedFiles})
              </span>
            </div>
            <p className="text-xs text-[#52c41a] font-medium">
              {isReceivingActive
                ? `Fájlok érkezése folyamatban... (${uniqueReceivedFiles.length}/${totalExpectedFiles})`
                : 'Sikeresen megérkezett a csomag!'}
            </p>
          </div>
        </div>

        <button
          onClick={onClearReceived}
          className="p-2 rounded-xl bg-[#141414] hover:bg-[#ff4d4f]/10 text-white/45 hover:text-[#ff4d4f] border border-[#303030] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
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
          className="w-full py-3.5 px-6 rounded-xl bg-[#1677ff] hover:bg-[#4096ff] active:bg-[#0958d9] text-white font-bold text-sm shadow-md active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all cursor-pointer animate-fade-in"
        >
          <Download className="w-5 h-5 text-white" />
          <span>{platform.getSaveLabel(uniqueReceivedFiles.length)}</span>
        </button>
      )}

      {/* Collapsible Gallery Toggle */}
      <div className="w-full pt-2 border-t border-[#303030]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-3 rounded-lg bg-[#141414] hover:bg-[#262626] text-white/65 hover:text-white flex items-center justify-between transition-all cursor-pointer min-h-[40px] active:scale-[0.99]"
        >
          <span className="text-xs sm:text-sm font-semibold">{getToggleText()}</span>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-white/45" />
            : <ChevronDown className="w-4 h-4 text-white/45" />}
        </button>
      </div>

      {/* Thumbnails */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {uniqueReceivedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#141414] border border-[#303030] shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getMediaPreview(item)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white/90 truncate">{item.name}</p>
                  <p className="text-[11px] text-white/45 font-medium">{formatBytes(item.size)}</p>
                </div>
              </div>

              {autoSavedFiles.has(item.name) ? (
                <div
                  className="p-2.5 rounded-lg bg-[#52c41a]/10 border border-[#52c41a]/30 shrink-0 flex items-center justify-center"
                  title="Automatikusan elmentve"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#52c41a]" />
                </div>
              ) : (
                <button
                  onClick={() => platform.saveFile(item)}
                  className="p-2.5 rounded-lg bg-[#1f1f1f] border border-[#303030] text-[#1677ff] hover:bg-[#262626] hover:border-[#1677ff]/60 transition-all shrink-0 flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                  title={platform.autoDownloads ? 'Letöltés újra' : 'Mentés a galériába'}
                >
                  <Download className="w-4 h-4 text-[#1677ff]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
