import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function QrScannerModal({ lang, onClose, onScanSuccess }) {
  const t = translations[lang];

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        console.log('Decoded QR Text:', decodedText);
        scanner.clear().catch((e) => console.error(e));
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // ignore scan failures per frame
      }
    );

    return () => {
      scanner.clear().catch((e) => console.error(e));
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 flex flex-col gap-4 border border-indigo-500/30 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Camera className="w-4 h-4" />
            <span>{t.openCameraScanner}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Container */}
        <div className="w-full bg-slate-900 rounded-2xl overflow-hidden p-2 text-slate-900">
          <div id="qr-reader" className="w-full text-slate-100" />
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          {t.cancel}
        </button>

      </div>
    </div>
  );
}
