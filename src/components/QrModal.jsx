import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);
  const currentUrl = window.location.href;

  useEffect(() => {
    // Lock background scrolling while QR overlay is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 260,
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

    return () => {
      // Restore background scrolling when closed
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, [currentUrl]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121214]/95 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={onClose}
        className="bg-white p-3.5 rounded-2xl shadow-2xl border border-zinc-700 cursor-pointer active:scale-95 transition-transform"
      >
        <canvas ref={canvasRef} className="rounded-xl block" />
      </div>
    </div>
  );
}
