import React from 'react';
import { AlertTriangle, CheckCircle2, QrCode, RotateCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, isRefreshing }) {
  return (
    <header className="w-full border-b border-[#303030] bg-[#141414]/90 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="max-w-4xl mx-auto px-4 py-2.5 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Empty */}
        <div className="flex-1" />

        {/* Right Side Action Controls: Ant Design Status Badge -> QR -> Refresh */}
        <div className="flex items-center gap-2">
          
          {/* Ant Design Tag / Badge */}
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              isConnected
                ? 'bg-[#52c41a]/10 border-[#52c41a]/30 text-[#52c41a]'
                : 'bg-[#faad14]/10 border-[#faad14]/30 text-[#faad14]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-[#52c41a] animate-pulse' : 'bg-[#faad14]'
              }`}
            />
            <span className="hidden xs:inline font-semibold">
              {isConnected ? 'Aktív' : 'Kapcsolódás...'}
            </span>
          </div>

          {/* QR Code Button */}
          <button
            onClick={onOpenQr}
            className="p-2 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#303030] hover:border-[#1677ff]/60 text-[#1677ff] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="QR-kód megosztása"
          >
            <QrCode className="w-4 h-4 text-[#1677ff]" />
          </button>

          {/* App Refresh Button */}
          <button
            onClick={onForceReload}
            className="p-2 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#303030] hover:border-[#1677ff]/60 text-[#1677ff] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="App frissítése"
          >
            <RotateCw className={`w-4 h-4 text-[#1677ff] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
