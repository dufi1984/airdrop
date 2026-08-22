import React from 'react';
import { AlertTriangle, CheckCircle2, QrCode, RotateCw } from 'lucide-react';

export default function Header({ isConnected, onOpenQr, onForceReload, onOpenLogs, isRefreshing }) {
  return (
    <header className="w-full border-b border-white/[0.08] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Empty */}
        <div className="flex-1" />

        {/* Right Side Action Controls: Ant Design Status Badge -> QR -> Refresh */}
        <div className="flex items-center gap-2.5">
          
          {/* Ant Design Status Badge (Click to open Diagnostic Logs) */}
          <button
            onClick={onOpenLogs}
            className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all select-none cursor-pointer hover:brightness-110 active:scale-95 border ${
              isConnected
                ? 'bg-[#132a13] border-[#235323] text-[#52c41a]'
                : 'bg-[#2b2111] border-[#594214] text-[#faad14]'
            }`}
            title="Kattints a Rendszernapló & Diagnosztika megnyitásához"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isConnected ? 'bg-[#52c41a]' : 'bg-[#faad14]'
              }`}
            />
            <span className="hidden xs:inline text-[11px] font-medium">
              {isConnected ? 'Online' : 'Csatlakozás...'}
            </span>
          </button>

          {/* QR Code Float Button (matching FloatButton circular style in screenshot) */}
          <button
            onClick={onOpenQr}
            className="w-8 h-8 rounded-full bg-[#141414] hover:bg-[#1a1a1a] border border-white/[0.15] hover:border-[#1677ff] text-white/80 hover:text-[#1677ff] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="QR-kód megosztása"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>

          {/* App Refresh Float Button */}
          <button
            onClick={onForceReload}
            className="w-8 h-8 rounded-full bg-[#141414] hover:bg-[#1a1a1a] border border-white/[0.15] hover:border-[#1677ff] text-white/80 hover:text-[#1677ff] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="App frissítése"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
