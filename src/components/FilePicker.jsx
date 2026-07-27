import React, { useRef, useState } from 'react';
import { UploadCloud, Image, Film, FileText, Trash2, ArrowDown, AlertTriangle } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

// 500MB safety threshold per file to prevent iOS Safari OOM crashes
const MAX_MOBILE_FILE_SIZE = 500 * 1024 * 1024;

export default function FilePicker({ lang, files, setFiles }) {
  const t = translations[lang];
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFileChange = (e) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        
        // Filter out oversized files on mobile to prevent Safari WebProcess OOM crashes
        const validFiles = [];
        let oversizedCount = 0;

        newFiles.forEach((file) => {
          if (isMobile && file.size > MAX_MOBILE_FILE_SIZE) {
            oversizedCount++;
          } else {
            validFiles.push(file);
          }
        });

        if (oversizedCount > 0) {
          setSizeWarning(`⚠️ ${oversizedCount} fájl meghaladta a 500 MB-os mobil memóriahatárt a telefon védelmében.`);
          setTimeout(() => setSizeWarning(null), 5000);
        }

        if (validFiles.length > 0) {
          setFiles((prev) => [...prev, ...validFiles]);
        }
      }
    } catch (err) {
      console.error('File selection error:', err);
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
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
    if (file.type.startsWith('video/')) return <Film className="w-5 h-5 text-cyan-400" />;
    return <FileText className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="w-full glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-6 border border-zinc-700/60 transition-all">
      
      {/* Raw original media picker input without forced iOS transcoding */}
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*,audio/*,.heic,.heif,.mov,.mp4,.m4v,.zip,.pdf,.doc,.docx,*/*"
        className="hidden"
      />

      {/* Warning Toast */}
      {sizeWarning && (
        <div className="w-full p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{sizeWarning}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full min-h-[160px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group ${
          isDragging
            ? 'border-blue-400 bg-blue-500/20 scale-[0.99]'
            : 'border-zinc-700 bg-zinc-900/80 hover:border-blue-400 hover:bg-zinc-900/90'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-zinc-100 mb-1 tracking-wide">
          Tallózás
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400">
          Húzd ide a fájlokat, vagy kattints ide a megnyitáshoz
        </p>
      </div>

      {/* Selected Files Queue */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
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
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-200"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {getFileIcon(file)}
                  <div className="truncate">
                    <p className="font-semibold truncate text-zinc-100">{file.name}</p>
                    <p className="text-[11px] text-zinc-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Guidance Banner */}
          <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-center gap-2 font-semibold">
            <ArrowDown className="w-4 h-4 animate-bounce text-blue-400" />
            <span>Koppints az alábbi Online Eszköz kártyára a küldés elindításához!</span>
          </div>
        </div>
      )}

    </div>
  );
}
