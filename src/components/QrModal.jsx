import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check } from 'lucide-react';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 190,
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

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 400);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in cursor-pointer"
    >
      <div
        onClick={onClose}
        className="w-full max-w-[240px] bg-zinc-900/95 rounded-2xl p-4 flex flex-col items-center text-center gap-3 border border-zinc-800 shadow-2xl cursor-pointer"
      >
        {/* Ultra Clean Minimal QR Code Canvas */}
        <div className="p-2.5 bg-white rounded-xl shadow-md border border-zinc-700">
          <canvas ref={canvasRef} className="rounded-lg block" />
        </div>

        {/* Clean Copy URL Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Kimásolva!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>URL másolása</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
