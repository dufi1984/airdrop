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
    <div className="w-full bg-[#111111] rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 border border-white/[0.08] shadow-2xl animate-fade-in">
      
      {/* Title & Direction Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isSending 
              ? 'bg-[#112544] border-[#163c70] text-[#1677ff]' 
              : 'bg-[#13c2c2]/10 border-[#13c2c2]/30 text-[#13c2c2]'
          }`}>
            {isSending ? (
              <ArrowUpRight className="w-4 h-4 animate-pulse" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white/90">
              {isSending ? t.sendingFiles : t.receivingFiles}
            </h3>
            <p className="text-[11px] text-white/45 font-normal">
              {currentIndex} / {totalFiles} - {fileName} ({formatBytes(fileSize)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 text-[#1677ff] animate-spin" />
          <span className="text-sm font-semibold font-mono text-[#1677ff]">
            {progress}%
          </span>
        </div>
      </div>

      {/* Ant Design Style Progress Bar */}
      <div className="w-full h-2 bg-[#1c1c1c] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-300 bg-[#1677ff]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Metrics Footer (Speed & ETA) */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-normal text-white/60 pt-1 border-t border-white/[0.08]">
        <div className="flex items-center gap-1.5 bg-[#171717] p-2 rounded-lg border border-white/[0.08]">
          <Gauge className="w-3.5 h-3.5 text-[#1677ff]" />
          <span>{t.speed}: <strong className="text-white/90 font-medium">{formatSpeed(speed)}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#171717] p-2 rounded-lg border border-white/[0.08]">
          <Clock className="w-3.5 h-3.5 text-[#13c2c2]" />
          <span>{t.remainingTime}: <strong className="text-white/90 font-medium">{formatEta(eta)}</strong></span>
        </div>
      </div>

    </div>
  );
}
