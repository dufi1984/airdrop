import React from 'react';
import { AlertTriangle, CheckCircle2, QrCode, RotateCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="max-w-4xl mx-auto px-4 py-3.5 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Completely Empty per user request */}
        <div className="flex-1" />

        {/* Right Side Action Controls (WCAG AAA High Contrast): Status Badge -> QR -> Refresh */}
        <div className="flex items-center gap-2.5">
          
          {/* Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">Aktív</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                <span className="hidden xs:inline">Kapcsolódás...</span>
              </>
            )}
          </div>

          {/* QR Code Button (WCAG AAA High Contrast White Icon on Dark Zinc) */}
          <button
            onClick={onOpenQr}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500 hover:text-white transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center"
            title="QR-kód megosztása"
          >
            <QrCode className="w-4.5 h-4.5 text-zinc-100" />
          </button>

          {/* App Refresh Button (WCAG AAA High Contrast White Icon on Dark Zinc) */}
          <button
            onClick={onForceReload}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500 hover:text-white transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center"
            title="App frissítése"
          >
            <RotateCw className={`w-4.5 h-4.5 text-zinc-100 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
