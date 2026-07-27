import React from 'react';
import { QrCode, RefreshCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full bg-zinc-950/80 border-b border-zinc-800/80 backdrop-blur-md sticky top-0 z-40 px-3.5 sm:px-6 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
      <div className="max-w-4xl mx-auto flex items-center justify-between min-h-[36px]">
        
        {/* Left Side: Completely Empty as explicitly requested */}
        <div></div>

        {/* Right Side Control Buttons: QR Code & Refresh */}
        <div className="flex items-center gap-2">
          
          {/* QR Code Action Button */}
          <button
            onClick={onOpenQr}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-800 hover:border-blue-500/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            title="QR-kód megnyitása"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
          </button>

          {/* Cache-Busting Refresh Action Button */}
          <button
            onClick={onForceReload}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-800 hover:border-blue-500/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            title="App frissítése"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>
      </div>
    </header>
  );
}
