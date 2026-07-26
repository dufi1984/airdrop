import React from 'react';
import { Settings, Wifi, QrCode } from 'lucide-react';

export default function Header({ isConnected, onlineCount, onOpenQr, onOpenSettings }) {
  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 safe-top-padding pb-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Top Left: Share Button (Material Dark Teal Accent) */}
        <button
          onClick={onOpenQr}
          className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border border-white/15 transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold shadow-md"
          title="Megosztás"
        >
          <QrCode className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">Megosztás</span>
        </button>

        {/* Top Right: Status Badge & Settings Icon */}
        <div className="flex items-center gap-2.5">
          
          {/* Status Badge (Material Dark Emerald) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md transition-all ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
            title={isConnected ? `Csatlakozva (Online: ${onlineCount})` : 'Kapcsolódás...'}
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-200">({onlineCount})</span>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border border-white/15 transition-all active:scale-95 shadow-md"
            title="Beállítások"
          >
            <Settings className="w-4 h-4 text-teal-400" />
          </button>

        </div>

      </div>
    </header>
  );
}
