import React from 'react';
import { Zap, Globe, Settings, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Header({ lang, setLang, isConnected, peerCount, onOpenSettings }) {
  const t = translations[lang];

  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse-slow">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                {t.appTitle}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> 100% Free
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Status Badge & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${
            isConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>{peerCount > 0 ? `${t.statusConnected} (${peerCount})` : t.statusConnecting}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{t.statusConnecting}</span>
              </>
            )}
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-white/10 transition-all active:scale-95"
            title="Nyelv váltás / Change language"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.switchLang}</span>
          </button>

          {/* Settings Button */}
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
