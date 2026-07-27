import React, { useRef, useState } from 'react';
import { FolderSearch, Image, Film, FileText, Trash2, ArrowDown, CheckCircle2 } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatBytes } from '../utils/formatters';

export default function FilePicker({ lang, files, setFiles }) {
  const t = translations[lang];
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [largeFileNotice, setLargeFileNotice] = useState(null);

  const handleFileChange = (e) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        
        const hasLargeFile = newFiles.some((f) => f.size > 500 * 1024 * 1024);
        if (hasLargeFile) {
          setLargeFileNotice('⚡ Nagy fájl (1GB+) kiválasztva — 64KB P2P micro-stream aktív!');
          setTimeout(() => setLargeFileNotice(null), 6000);
        }

        setFiles((prev) => [...prev, ...newFiles]);
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
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-cyan-400" />;
    return <FileText className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="w-full bg-zinc-900/90 rounded-2xl p-4 flex flex-col gap-3.5 border border-zinc-800 shadow-xl">
      
      {/* Strict Photo & Video Gallery Input */}
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Reassuring Large File Toast */}
      {largeFileNotice && (
        <div className="w-full p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{largeFileNotice}</span>
        </div>
      )}

      {/* Ultra Compact Drag & Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full py-3 px-4 rounded-xl border border-dashed transition-all flex items-center justify-center gap-3 cursor-pointer group ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-zinc-700 bg-zinc-950/80 hover:border-blue-500 hover:bg-zinc-950'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <FolderSearch className="w-4.5 h-4.5 text-blue-400" />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-100 tracking-normal">
            Tallózás
          </h3>
          <span className="text-xs text-zinc-400 font-normal">
            — {t.dragDropText}
          </span>
        </div>
      </div>

      {/* Selected Files Queue */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              {files.length} {t.filesSelected}
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearQueue}
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-1.5">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 shadow-sm shrink-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {getFileIcon(file)}
                  <div className="truncate">
                    <p className="font-semibold truncate text-zinc-100">{file.name}</p>
                    <p className="text-[11px] text-zinc-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Guidance Banner */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-center gap-2 font-medium">
            <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Koppints az alábbi Online Eszköz kártyára a küldés elindításához!</span>
          </div>
        </div>
      )}

    </div>
  );
}
