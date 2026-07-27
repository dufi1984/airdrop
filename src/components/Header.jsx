import React from 'react';
import { Wifi, AlertTriangle, CheckCircle2, QrCode, Settings, RotateCw } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Header({ lang, isConnected, onlineCount, onOpenQr, onOpenSettings, onForceReload, isRefreshing }) {
  const t = translations[lang];

  return (
    <header className="w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3.5 sm:px-6 flex items-center justify-between">
        
        {/* App Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-100 flex items-center gap-2">
              {t.appTitle}
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Status Badge -> QR -> Refresh -> Settings */}
        <div className="flex items-center gap-2">
          
          {/* Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">Aktív</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span className="hidden xs:inline">Kapcsolódás...</span>
              </>
            )}
          </div>

          {/* QR Code Button (Icon only) */}
          <button
            onClick={onOpenQr}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all active:scale-95 shadow-md cursor-pointer"
            title="QR-kód megosztása"
          >
            <QrCode className="w-4.5 h-4.5 text-blue-400" />
          </button>

          {/* App Refresh Button (Icon only) */}
          <button
            onClick={onForceReload}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-blue-300 border border-white/10 transition-all active:scale-95 shadow-md cursor-pointer"
            title="App frissítése"
          >
            <RotateCw className={`w-4.5 h-4.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Button (Icon only) */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all active:scale-95 shadow-md cursor-pointer"
            title={t.serverConfig}
          >
            <Settings className="w-4.5 h-4.5 text-zinc-400" />
          </button>

        </div>

      </div>
    </header>
  );
}
