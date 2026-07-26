import React, { useRef, useState } from 'react';
import { UploadCloud, Image, Film, FileText, Trash2, ArrowDown } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function FilePicker({ lang, files, setFiles }) {
  const t = translations[lang];
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-indigo-400" />;
    if (file.type.startsWith('video/')) return <Film className="w-5 h-5 text-cyan-400" />;
    return <FileText className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-6 border border-indigo-500/30 transition-all">
      
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Drag & Drop Zone / Main Page File Box */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full min-h-[160px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/20 scale-[0.99]'
            : 'border-indigo-500/40 bg-slate-900/50 hover:border-indigo-400 hover:bg-slate-900/80'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-white mb-1 tracking-wide">
          Tallózás
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Húzd ide a fájlokat, vagy kattints ide a megnyitáshoz
        </p>
      </div>

      {/* Selected Files Queue */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {files.length} {t.filesSelected}
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearQueue}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-200"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {getFileIcon(file)}
                  <div className="truncate">
                    <p className="font-semibold truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Guidance Banner */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-center gap-2 font-semibold">
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span>Koppints az alábbi Online Eszköz kártyára a küldés elindításához!</span>
          </div>
        </div>
      )}

    </div>
  );
}
