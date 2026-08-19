import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { peerNetworkService } from '../services/peerNetworkService';
import { QrCode, X } from 'lucide-react';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);

  // Generate pairing URL with room and direct peer ID
  const shareUrl = (() => {
    const origin = window.location.origin + window.location.pathname;
    const myId = peerNetworkService.myId;
    const roomId = peerNetworkService.roomId || 'lobby';
    if (myId) {
      return `${origin}#connect=${encodeURIComponent(myId)}&room=${encodeURIComponent(roomId)}`;
    }
    return `${origin}#room=${encodeURIComponent(roomId)}`;
  })();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        shareUrl,
        {
          width: 250,
          margin: 1,
          color: {
            dark: '#111111',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('QR Render Error:', err);
        }
      );
    }

    return () => {
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, [shareUrl]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-white/[0.12] p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs w-full cursor-default"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-white/90 font-semibold text-sm">
            <QrCode className="w-4 h-4 text-[#1677ff]" />
            <span>Azonnali QR Párosítás</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-inner">
          <canvas ref={canvasRef} className="rounded-xl block" />
        </div>

        <p className="text-xs text-white/60">
          Olvasd be a másik telefon kamerájával az azonnali csatlakozáshoz!
        </p>
      </div>
    </div>
  );
}
