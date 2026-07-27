import React from 'react';
import { QrCode, RefreshCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Top Left: Clean Empty Space as requested */}
        <div className="flex items-center gap-2">
          {!isConnected && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Kapcsolódás...</span>
            </div>
          )}
        </div>

        {/* Top Right: Clean Controls (QR Code ➔ Refresh) */}
        <div className="flex items-center gap-2">
          
          {/* QR Code Action Button */}
          <button
            onClick={onOpenQr}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            title="QR-kód megnyitása"
          >
            <QrCode className="w-4.5 h-4.5 text-blue-400" />
          </button>

          {/* App Cache-Busting Refresh Button */}
          <button
            onClick={onForceReload}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            title="Alkalmazás frissítése"
          >
            <RefreshCw className={`w-4.5 h-4.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
