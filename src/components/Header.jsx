import React from 'react';
import { Zap, Globe, Settings, Wifi, LogOut, ChevronRight } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Header({ lang, setLang, roomId, isPeerConnected, onNewRoom, onOpenSettings }) {
  const t = translations[lang];

  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
        
        {/* Brand Logo & Breadcrumb Navigation */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                {t.appTitle}
              </h1>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <span>{t.homeBreadcrumb}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-indigo-400 font-mono font-bold">
                  {t.roomBreadcrumb}: #{roomId}
                </span>
              </div>
            </div>
          </div>

          {/* Leave/New Room button for mobile */}
          <button
            onClick={onNewRoom}
            className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] font-semibold border border-white/10"
          >
            <LogOut className="w-3 h-3" />
            <span>Kilépés</span>
          </button>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${
            isPeerConnected
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
          }`}>
            <Wifi className={`w-3.5 h-3.5 ${isPeerConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              {isPeerConnected ? t.statusConnected : t.statusWaiting}
            </span>
          </div>

          {/* New Room / Exit Button (Desktop) */}
          <button
            onClick={onNewRoom}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 text-xs font-semibold border border-white/10 transition-all active:scale-95"
            title={t.newRoom}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>{t.newRoom}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-white/10 transition-all active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.switchLang}</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/10 transition-all active:scale-95"
            title={t.serverConfig}
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
