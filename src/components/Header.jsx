import React from 'react';
import { Settings, Wifi, QrCode } from 'lucide-react';

export default function Header({ isConnected, onlineCount, onOpenQr, onOpenSettings }) {
  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Top Left: Share Button */}
        <button
          onClick={onOpenQr}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/10 transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold"
          title="Megosztás"
        >
          <QrCode className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Megosztás</span>
        </button>

        {/* Top Right: Minimalist Status Badge & Settings Icon */}
        <div className="flex items-center gap-2.5">
          
          {/* Simplified Status Badge (Wifi + Green Dot + Count) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md transition-all ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
            }`}
            title={isConnected ? `Csatlakozva (Online: ${onlineCount})` : 'Kapcsolódás...'}
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-300">({onlineCount})</span>
          </div>

          {/* Settings Icon Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/10 transition-all active:scale-95"
            title="Beállítások"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
          </button>

        </div>

      </div>
    </header>
  );
}
