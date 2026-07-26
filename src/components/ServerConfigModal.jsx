import React from 'react';
import { Settings, X, Globe, Save } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function ServerConfigModal({ lang, setLang, onClose }) {
  const t = translations[lang];

  const handleSave = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-6 border border-indigo-500/40 shadow-2xl relative cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {t.serverConfig}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          
          {/* Language Selector Section */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{t.switchLang}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang('hu')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                  lang === 'hu'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🇭🇺 {t.langNameHU}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                  lang === 'en'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🇬🇧 {t.langNameEN}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 mt-2"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveSettings}</span>
          </button>

        </form>

      </div>
    </div>
  );
}
