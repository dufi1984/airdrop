import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Link, Copy, Check, Smartphone } from 'lucide-react';
import { peerNetworkService } from '../services/peerNetworkService';

export default function QrModal({ onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Wait a tick to ensure peerNetworkService.myId is set
    const buildUrl = () => {
      const url = peerNetworkService.getShareUrl();
      setShareUrl(url);
      if (canvasRef.current && url) {
        QRCode.toCanvas(
          canvasRef.current,
          url,
          {
            width: 240,
            margin: 1,
            color: { dark: '#111111', light: '#ffffff' },
          },
          (err) => { if (err) console.error('QR Render Error:', err); }
        );
      }
    };

    if (peerNetworkService.myId) {
      buildUrl();
    } else {
      // Poll until ID is ready (should be < 1s normally)
      const poll = setInterval(() => {
        if (peerNetworkService.myId) {
          clearInterval(poll);
          buildUrl();
        }
      }, 200);
      setTimeout(() => clearInterval(poll), 10000);
    }

    return () => {
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, []);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-white/[0.12] p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-white/90 font-semibold text-sm">
            <QrCode className="w-4 h-4 text-[#1677ff]" />
            <span>Párosítás QR-kóddal</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instruction */}
        <div className="flex items-start gap-2.5 w-full p-3 rounded-xl bg-[#112544] border border-[#163c70] text-left">
          <Smartphone className="w-4 h-4 text-[#1677ff] shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#4096ff] font-medium leading-relaxed">
            Olvasd be ezt a QR-kódot <strong>a másik eszközzel</strong>, vagy másold és küldd el a linket, hogy azonnal kapcsolódjanak.
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-3 rounded-2xl shadow-inner">
          <canvas ref={canvasRef} className="rounded-xl block" />
        </div>

        {/* Share Link */}
        <div className="flex w-full gap-2">
          <div className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-[11px] text-white/50 font-mono truncate text-left">
            {shareUrl || 'Saját ID betöltése...'}
          </div>
          <button
            onClick={handleCopyLink}
            disabled={!shareUrl}
            className="px-3 py-2 rounded-lg ant-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Másolva!' : 'Link'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
