import React from 'react';
import { Settings, Wifi } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Header({ lang, isConnected, onlineCount, onOpenSettings }) {
  const t = translations[lang];

  return (
    <header className="w-full glass-panel sticky top-0 z-30 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Connection Status Badge (Left) */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${
          isConnected
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
        }`}>
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>
            {isConnected ? `${t.statusConnected} (${onlineCount})` : t.statusConnecting}
          </span>
        </div>

        {/* Settings Gear Icon Button (Right) */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/10 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-medium"
          title={t.serverConfig}
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">{t.serverConfig}</span>
        </button>

      </div>
    </header>
  );
}
