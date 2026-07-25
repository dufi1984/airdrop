import React from 'react';
import { Zap, Globe, Settings, Wifi } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Header({ lang, setLang, isConnected, onlineCount, onOpenSettings }) {
  const t = translations[lang];

  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              {t.appTitle}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2.5">
          
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${
            isConnected
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
          }`}>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isConnected ? `${t.statusConnected} (${onlineCount})` : t.statusConnecting}
            </span>
          </div>

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
