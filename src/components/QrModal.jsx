import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function QrModal({ lang, onClose }) {
  const t = translations[lang];
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
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

  const copyToClipboard = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <span>Oldal Megosztása QR-kóddal</span>
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

        <p className="text-xs text-slate-300">
          Olvasd be ezt a QR-kódot a másik telefon vagy iPad kamerájával a megnyitáshoz!
        </p>

        {/* Copy Link Button */}
        <button
          onClick={copyToClipboard}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{t.linkCopied}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-indigo-400" />
              <span>Link Másolása</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
