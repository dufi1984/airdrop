import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, X } from 'lucide-react';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);
  const currentUrl = window.location.href;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('QR Render Error:', err);
        }
      );
    }
  }, [currentUrl]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 flex flex-col items-center text-center gap-5 border border-indigo-500/40 shadow-2xl relative cursor-default"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>Oldal megosztása</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-indigo-500/30">
          <canvas ref={canvasRef} className="rounded-lg max-w-full" />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          Olvasd be ezt a QR-kódot a másik eszköz kamerájával a megnyitáshoz!
        </p>

      </div>
    </div>
  );
}
