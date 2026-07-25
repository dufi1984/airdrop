import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function QrScannerModal({ lang, onClose, onScanSuccess }) {
  const t = translations[lang];
  const [errorMsg, setErrorMsg] = useState(null);
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    const qrRegionId = 'clean-qr-scanner-region';
    const html5Qrcode = new Html5Qrcode(qrRegionId);
    html5QrcodeRef.current = html5Qrcode;

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          console.log('✅ QR Scanned:', decodedText);
          if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().then(() => {
              onScanSuccess(decodedText);
            }).catch(() => {
              onScanSuccess(decodedText);
            });
          }
        },
        (errorMessage) => {
          // Frame scan failures ignored
        }
      )
      .catch((err) => {
        console.error('Camera Access Error:', err);
        setErrorMsg(t.cameraError);
      });

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch((e) => console.log(e));
      }
    };
  }, [onScanSuccess, t.cameraError]);

  const handleClose = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => onClose()).catch(() => onClose());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 flex flex-col gap-4 border border-indigo-500/40 shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>{t.openCameraScanner}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Kamera hiba</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-indigo-500/30 min-h-[280px] flex items-center justify-center">
            {/* Target Viewfinder Region */}
            <div id="clean-qr-scanner-region" className="w-full h-full" />

            {/* Scanning Overlay Laser Line */}
            <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-xl relative shadow-lg shadow-indigo-500/20">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-1/2 left-0 animate-pulse shadow-md shadow-cyan-400" />
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 font-medium">
          {t.cameraPermissionPrompt}
        </p>

        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
        >
          {t.cancel}
        </button>

      </div>
    </div>
  );
}
