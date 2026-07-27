import React from 'react';
import { QrCode, RefreshCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full bg-zinc-950/80 border-b border-zinc-800/80 backdrop-blur-md sticky top-0 z-40 px-3.5 sm:px-6 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
      <div className="max-w-4xl mx-auto flex items-center justify-between min-h-[36px]">
        
        {/* Left Side: Connection Warning ONLY shown if disconnected (Zero visual noise when connected) */}
        <div className="flex items-center gap-2">
          {!isConnected && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Kapcsolódás a hálózathoz...</span>
            </div>
          )}
        </div>

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
