import React, { useState } from 'react';
import { Settings, X, Globe, Copy, Check, Server } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function ServerConfigModal({ lang, setLang, onClose }) {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  const signalingUrl = 'https://0.peerjs.com (Auto P2P Cloud)';

  const handleCopyUrl = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(signalingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-6 border border-indigo-500/40 shadow-2xl relative cursor-default"
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

        <div className="flex flex-col gap-5">
          
          {/* Language Selector Section */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{t.switchLang}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang('hu')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  lang === 'hu'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🇭🇺 {t.langNameHU}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  lang === 'en'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🇬🇧 {t.langNameEN}
              </button>
            </div>
          </div>

          {/* Read-Only Signaling Server URL Section with Copy Button */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Signaling Szerver Hálózat</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={signalingUrl}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-indigo-500/20 text-slate-300 text-xs font-mono read-only:cursor-not-allowed select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all active:scale-95"
                title="Másolás vágólapra"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Másolva!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    <span className="text-[11px]">Másolás</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Automatikus 100% ingyenes felhős P2P hálózat. Nem szükséges módosítani.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
