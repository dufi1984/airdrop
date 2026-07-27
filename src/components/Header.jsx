import React from 'react';
import { AlertTriangle, CheckCircle2, QrCode, RotateCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="max-w-4xl mx-auto px-4 py-2.5 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Completely Empty per user request */}
        <div className="flex-1" />

        {/* Right Side Action Controls: Status Badge -> QR -> Refresh */}
        <div className="flex items-center gap-2">
          
          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">Aktív</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-bounce" />
                <span className="hidden xs:inline">Kapcsolódás...</span>
              </>
            )}
          </div>

          {/* QR Code Button (Material Blue Accent) */}
          <button
            onClick={onOpenQr}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-blue-500/20 border border-zinc-700/80 hover:border-blue-500/50 text-blue-400 transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center"
            title="QR-kód megosztása"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
          </button>

          {/* App Refresh Button (Material Blue Accent) */}
          <button
            onClick={onForceReload}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-blue-500/20 border border-zinc-700/80 hover:border-blue-500/50 text-blue-400 transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center"
            title="App frissítése"
          >
            <RotateCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
