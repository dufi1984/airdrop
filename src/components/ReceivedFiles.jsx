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
          className="w-12 h-12 object-cover rounded-lg border border-white/[0.08] shrink-0"
        />
      );
    }
    if (item.mimeType.startsWith('video/')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-[#13c2c2]/10 border border-[#13c2c2]/30 flex items-center justify-center shrink-0">
          <Film className="w-5 h-5 text-[#13c2c2]" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-lg bg-[#faad14]/10 border border-[#faad14]/30 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-[#faad14]" />
      </div>
    );
  };

  const getToggleText = () =>
    isExpanded
      ? 'Képek elrejtése'
      : `Képek megtekintése (${uniqueReceivedFiles.length})`;

  return (
    <div ref={containerRef} className="w-full bg-[#111111] rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 border border-white/[0.08] shadow-2xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#132a13] flex items-center justify-center border border-[#235323]">
            {isReceivingActive
              ? <Loader2 className="w-4 h-4 text-[#1677ff] animate-spin" />
              : <CheckCircle2 className="w-4 h-4 text-[#52c41a]" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-sm sm:text-base font-semibold text-white/90">
                {t.receivedPackageTitle}
              </h3>
              <span className="text-xs font-mono text-[#1677ff]">
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
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#ff4d4f]/10 text-white/45 hover:text-[#ff4d4f] border border-white/[0.08] transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          title={t.rejectPackage}
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.rejectPackage}</span>
        </button>
      </div>

      {/* iOS manual save all */}
      {isPackageComplete && !platform.autoDownloads && (
        <button
          onClick={() => platform.saveAllFiles(uniqueReceivedFiles)}
          className="w-full py-2.5 px-4 ant-btn-primary font-medium text-xs sm:text-sm shadow-md active:scale-[0.98] flex items-center justify-center gap-2 transition-all cursor-pointer animate-fade-in"
        >
          <Download className="w-4 h-4 text-white" />
          <span>{platform.getSaveLabel(uniqueReceivedFiles.length)}</span>
        </button>
      )}

      {/* Collapsible Gallery Toggle */}
      <div className="w-full pt-1 border-t border-white/[0.08]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 px-2.5 rounded-md bg-[#171717] hover:bg-[#202020] text-white/65 hover:text-white flex items-center justify-between transition-all cursor-pointer min-h-[36px]"
        >
          <span className="text-xs font-medium">{getToggleText()}</span>
          {isExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-white/45" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/45" />}
        </button>
      </div>

      {/* Thumbnails */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {uniqueReceivedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg bg-[#171717] border border-white/[0.08] shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {getMediaPreview(item)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/90 truncate">{item.name}</p>
                  <p className="text-[11px] text-white/45">{formatBytes(item.size)}</p>
                </div>
              </div>

              {autoSavedFiles.has(item.name) ? (
                <div
                  className="p-1.5 rounded-md bg-[#132a13] border border-[#235323] shrink-0 flex items-center justify-center"
                  title="Automatikusan elmentve"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#52c41a]" />
                </div>
              ) : (
                <button
                  onClick={() => platform.saveFile(item)}
                  className="p-1.5 rounded-md ant-btn-default text-[#1677ff] hover:text-[#1677ff] transition-all shrink-0 flex items-center justify-center cursor-pointer"
                  title={platform.autoDownloads ? 'Letöltés újra' : 'Mentés a galériába'}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
