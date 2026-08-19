import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';
import { peerNetworkService } from '../services/peerNetworkService';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const render = (url) => {
      if (canvasRef.current && url) {
        QRCode.toCanvas(
          canvasRef.current,
          url,
          { width: 260, margin: 1, color: { dark: '#111111', light: '#ffffff' } },
          (err) => { if (err) console.error('QR render error:', err); }
        );
      }
    };

    const url = peerNetworkService.getShareUrl();
    if (url) {
      render(url);
    } else {
      // Poll until myId is ready
      const poll = setInterval(() => {
        const u = peerNetworkService.getShareUrl();
        if (u) { clearInterval(poll); render(u); }
      }, 200);
      setTimeout(() => clearInterval(poll), 10000);
    }

    return () => {
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-white/[0.12] p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3 cursor-default"
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-white/70 text-sm font-medium">QR kód</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-3 rounded-xl shadow-inner">
          <canvas ref={canvasRef} className="rounded-lg block" />
        </div>
      </div>
    </div>
  );
}
