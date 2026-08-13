import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2, Gauge, Clock } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes, formatSpeed, formatEta } from '../utils/formatters';

export default function TransferProgress({ lang, transferState }) {
  const t = translations[lang];

  if (!transferState) return null;

  const { direction, fileName, fileSize, progress, speed, eta, currentIndex, totalFiles } = transferState;
  const isSending = direction === 'send';

  return (
    <div className="w-full bg-[#1f1f1f] rounded-2xl p-5 sm:p-6 flex flex-col gap-4 border border-[#303030] shadow-xl animate-fade-in">
      
      {/* Title & Direction Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isSending 
              ? 'bg-[#1677ff]/10 border-[#1677ff]/30 text-[#1677ff]' 
              : 'bg-[#13c2c2]/10 border-[#13c2c2]/30 text-[#13c2c2]'
          }`}>
            {isSending ? (
              <ArrowUpRight className="w-5 h-5 animate-pulse" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white/90">
              {isSending ? t.sendingFiles : t.receivingFiles}
            </h3>
            <p className="text-xs text-white/45 font-medium">
              {currentIndex} / {totalFiles} - {fileName} ({formatBytes(fileSize)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#1677ff] animate-spin" />
          <span className="text-base sm:text-lg font-bold font-mono text-[#1677ff]">
            {progress}%
          </span>
        </div>
      </div>

      {/* Ant Design Style Progress Bar */}
      <div className="w-full h-2.5 bg-[#141414] rounded-full overflow-hidden p-0.5 border border-[#303030]">
        <div
          className="h-full rounded-full transition-all duration-300 bg-[#1677ff]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Metrics Footer (Speed & ETA) */}
      <div className="grid grid-cols-2 gap-3 text-xs font-medium text-white/65 pt-2 border-t border-[#303030]">
        <div className="flex items-center gap-2 bg-[#141414] p-2 rounded-lg border border-[#303030]">
          <Gauge className="w-4 h-4 text-[#1677ff]" />
          <span>{t.speed}: <strong className="text-white/90">{formatSpeed(speed)}</strong></span>
        </div>
        <div className="flex items-center gap-2 bg-[#141414] p-2 rounded-lg border border-[#303030]">
          <Clock className="w-4 h-4 text-[#13c2c2]" />
          <span>{t.remainingTime}: <strong className="text-white/90">{formatEta(eta)}</strong></span>
        </div>
      </div>

    </div>
  );
}
