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
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-[#1677ff]" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-[#13c2c2]" />;
    return <FileText className="w-4 h-4 text-[#faad14]" />;
  };

  const isEmpty = files.length === 0;

  return (
    <div className="w-full bg-[#1f1f1f] rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 border border-[#303030] shadow-xl transition-all">
      
      {/* Media Input Opening Gallery Directly on Android & Mobile */}
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
        <div className="w-full p-2.5 rounded-xl bg-[#1677ff]/10 border border-[#1677ff]/30 text-[#1677ff] text-xs font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1677ff] shrink-0" />
          <span>{largeFileNotice}</span>
        </div>
      )}

      {/* Ant Design Dragger Style Dashed Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full ant-dropzone flex items-center justify-center gap-3.5 cursor-pointer group transition-all duration-200 ${
          isEmpty
            ? 'py-10 px-6 min-h-[160px]'
            : 'py-4 px-5 min-h-[75px]'
        } ${isDragging ? 'is-dragging' : ''}`}
      >
        <div className={`rounded-xl bg-[#1677ff]/10 border border-[#1677ff]/20 flex items-center justify-center shrink-0 transition-all ${
          isEmpty ? 'w-12 h-12' : 'w-9 h-9'
        }`}>
          <FolderSearch className={`${isEmpty ? 'w-6 h-6' : 'w-4.5 h-4.5'} text-[#1677ff]`} />
        </div>
        <div className="flex flex-col text-left">
          <h3 className={`font-bold text-white/90 tracking-tight transition-all ${
            isEmpty ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
          }`}>
            Tallózás
          </h3>
          <p className="text-xs text-white/45 font-normal">
            {t.dragDropText}
          </p>
        </div>
      </div>

      {/* Selected Files Queue */}
      {!isEmpty && (
        <div className="flex flex-col gap-2 pt-1 border-t border-[#303030] animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1677ff] tracking-wider">
              {files.length} {t.filesSelected}
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-[#ff4d4f] hover:text-[#ff7875] flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearQueue}
            </button>
          </div>

          <div className="max-h-[175px] overflow-y-auto pr-1 flex flex-col gap-1.5">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-[#303030] hover:border-[#424242] text-xs text-white/88 shadow-sm shrink-0 h-[48px] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {getFileIcon(file)}
                  <div className="truncate">
                    <p className="font-medium truncate text-white/90">{file.name}</p>
                    <p className="text-[11px] text-white/45">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-white/45 hover:text-[#ff4d4f] hover:bg-[#262626] transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Guidance Banner */}
          <div className="p-2.5 rounded-xl bg-[#1677ff]/10 border border-[#1677ff]/30 text-xs text-[#1677ff] flex items-center justify-center gap-2 font-medium">
            <ArrowDown className="w-3.5 h-3.5 text-[#1677ff]" />
            <span>Válaszd ki az eszközt a küldéshez</span>
          </div>
        </div>
      )}

    </div>
  );
}
