import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Camera, ExternalLink } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function QrPairing({ lang, roomUrl, onOpenScanner }) {
  const t = translations[lang];
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && roomUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        roomUrl,
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
  }, [roomUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 border border-white/10">
      
      <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm tracking-wide uppercase">
        <QrCode className="w-4 h-4" />
        <span>{t.scanQrToConnect}</span>
      </div>

      {/* QR Code Container */}
      <div className="p-3 bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border-4 border-indigo-500/20">
        <canvas ref={canvasRef} className="rounded-lg max-w-full" />
      </div>

      <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
        {t.scanQrSubtitle}
      </p>

      {/* Actions */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3">
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
              <span>{t.copyLink}</span>
            </>
          )}
        </button>

        {/* Camera Scanner Button */}
        <button
          onClick={onOpenScanner}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 text-xs font-semibold border border-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Camera className="w-4 h-4 text-indigo-400" />
          <span>{t.openCameraScanner}</span>
        </button>
      </div>

    </div>
  );
}
