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
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-5 border border-indigo-500/40 animate-pulse-glow">
      
      {/* Title & Direction Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isSending ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {isSending ? (
              <ArrowUpRight className="w-6 h-6 animate-bounce" />
            ) : (
              <ArrowDownLeft className="w-6 h-6 animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {isSending ? t.sendingFiles : t.receivingFiles}
            </h3>
            <p className="text-xs text-slate-400">
              {currentIndex} / {totalFiles} - {fileName} ({formatBytes(fileSize)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-lg sm:text-xl font-extrabold text-indigo-300">
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isSending
              ? 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400'
              : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Metrics Footer (Speed & ETA) */}
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-300 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-indigo-400" />
          <span>{t.speed}: <strong className="text-white">{formatSpeed(speed)}</strong></span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>{t.remainingTime}: <strong className="text-white">{formatEta(eta)}</strong></span>
        </div>
      </div>

    </div>
  );
}
