import React, { useState } from 'react';
import { X, Server, Save, Check, Globe } from 'lucide-react';
import { translations } from '../i18n/translations';
import { socketService } from '../services/socketService';

export default function ServerConfigModal({ lang, setLang, onClose }) {
  const t = translations[lang];
  const [url, setUrl] = useState(socketService.getServerUrl());
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    socketService.setServerUrl(url.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 flex flex-col gap-5 border border-indigo-500/30 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Server className="w-4 h-4" />
            <span>{t.serverConfig}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection Option */}
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-900/80 border border-white/5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>{t.switchLang}</span>
          </label>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLang('hu')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                lang === 'hu'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              🇭🇺 {t.langNameHU}
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                lang === 'en'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 {t.langNameEN}
            </button>
          </div>
        </div>

        {/* Server Config Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.signalingServerUrl}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://airdrop-signaling.onrender.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Glitch, Render.com vagy saját szerver WebSocket URL-je.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Mentve!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t.saveSettings}</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
