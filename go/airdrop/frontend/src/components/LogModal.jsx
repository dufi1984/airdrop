import React, { useEffect, useState, useRef } from 'react';
import { X, Copy, Check, Trash2, Terminal, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';
import { logger } from '../utils/logger';

export default function LogModal({ onClose }) {
  const [logs, setLogs] = useState(logger.getLogs());
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    const unsub = logger.subscribe((updatedLogs) => {
      setLogs([...updatedLogs]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logger.exportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement('textarea');
      textArea.value = logger.exportText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    logger.clear();
    setLogs([]);
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'success':
        return 'text-[#52c41a] bg-[#132a13] border-[#235323]';
      case 'warn':
        return 'text-[#faad14] bg-[#2b2111] border-[#594214]';
      case 'error':
        return 'text-[#ff4d4f] bg-[#2a1215] border-[#58181c]';
      case 'ice':
        return 'text-[#13c2c2] bg-[#0e272a] border-[#155459]';
      default:
        return 'text-[#1677ff] bg-[#112544] border-[#163c70]';
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#141414] border border-white/[0.12] rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh] text-left"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111111]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1677ff]/10 border border-[#1677ff]/30 flex items-center justify-center text-[#1677ff]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white/90">
                  Rendszernapló & Diagnosztika
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">
                  {logs.length} bejegyzés
                </span>
              </div>
              <p className="text-[11px] text-white/45">
                Valós idejű WebRTC, TURN és átviteli állapotok
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="py-1 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/[0.1] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Napló másolása"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#52c41a]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Másolva!' : 'Másolás'}</span>
            </button>

            <button
              onClick={handleClear}
              className="p-1.5 rounded-md bg-white/[0.06] hover:bg-[#ff4d4f]/20 text-white/60 hover:text-[#ff4d4f] border border-white/[0.1] transition-all cursor-pointer"
              title="Napló törlése"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.1] transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Viewer List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 font-mono text-[11px] sm:text-xs flex flex-col gap-1.5 bg-[#0a0a0a] select-text">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-white/30 flex flex-col items-center justify-center gap-2">
              <Cpu className="w-6 h-6 opacity-40" />
              <span>Nincsenek még rögzített események.</span>
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded-lg bg-[#111111] border border-white/[0.05] hover:border-white/[0.1] transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/40 text-[10px]">{entry.time}</span>
                  <span className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold uppercase ${getLevelBadge(entry.level)}`}>
                    {entry.category}
                  </span>
                  <span className="text-white/90 font-medium break-all flex-1">
                    {entry.message}
                  </span>
                </div>
                {entry.details && (
                  <div className="text-[10px] text-white/50 pl-2 border-l border-white/[0.1] break-all font-mono">
                    {entry.details}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>

        {/* Footer info */}
        <div className="p-2.5 px-4 bg-[#111111] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/40">
          <span>Tipp: Hiba esetén a "Másolás" gombbal elmentheted a naplót.</span>
          <span className="font-mono">TURN Relay: Aktív</span>
        </div>
      </div>
    </div>
  );
}
