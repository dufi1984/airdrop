import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);
  const currentUrl = window.location.href;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#121214',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in cursor-pointer"
    >
      <div
        onClick={onClose}
        className="bg-white p-3 rounded-2xl shadow-2xl border border-zinc-700 cursor-pointer active:scale-95 transition-transform"
      >
        <canvas ref={canvasRef} className="rounded-xl block" />
      </div>
    </div>
  );
}
