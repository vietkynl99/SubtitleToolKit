import React, { useState, useRef } from 'react';
import SplitModal from './SplitModal';
import { SubtitleSegment } from '../types';
import { SplitResult, parseSRT, generateSRT, timeToSeconds, secondsToTime, formatDurationHMS } from '../services/subtitleLogic';
import { ICONS } from '../constants';

interface FileToolsPageProps {
  fileName: string;
  totalSegments: number;
  segments: SubtitleSegment[];
  onSplitConfirm: (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => Promise<void>;
  generatedFiles: SplitResult[];
  onDownloadGenerated: (file: SplitResult) => void;
  onLoadGenerated: (file: SplitResult) => void;
  onDeleteGenerated: (index: number) => void;
}

interface MergeFileEntry {
  id: string;
  name: string;
  segments: SubtitleSegment[];
  duration: number;
}

const FileToolsPage: React.FC<FileToolsPageProps> = (props) => {
  const [showSplitConfig, setShowSplitConfig] = useState(false);
  const [activeTool, setActiveTool] = useState<'menu' | 'split' | 'merge'>('menu');
  const [mergeFiles, setMergeFiles] = useState<MergeFileEntry[]>([]);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const mergeInputRef = useRef<HTMLInputElement | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const dragImageRef = useRef<HTMLImageElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const getSegmentsDuration = (segments: SubtitleSegment[]) => {
    if (segments.length === 0) return 0;
    return segments.reduce((max, seg) => {
      const end = timeToSeconds(seg.endTime);
      return end > max ? end : max;
    }, 0);
  };

  const normalizeSrtName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'merged.srt';
    return trimmed.toLowerCase().endsWith('.srt') ? trimmed : `${trimmed}.srt`;
  };

  const addMergeFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMergeLoading(true);
    setMergeError(null);
    try {
      const nextEntries: MergeFileEntry[] = [];
      for (const file of Array.from(files)) {
        const text = await file.text();
        const parsed = parseSRT(text);
        if (parsed.length === 0) {
          continue;
        }
        nextEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          name: file.name,
          segments: parsed,
          duration: getSegmentsDuration(parsed)
        });
      }

      if (nextEntries.length === 0) {
        setMergeError('No valid SRT segments found in selected files.');
        return;
      }

      setMergeFiles(prev => [...prev, ...nextEntries]);
    } catch (err) {
      setMergeError('Failed to read SRT files. Please try again.');
    } finally {
      setMergeLoading(false);
      if (mergeInputRef.current) mergeInputRef.current.value = '';
    }
  };

  const moveMergeFile = (index: number, direction: -1 | 1) => {
    setMergeFiles(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const moveMergeFileTo = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setMergeFiles(prev => {
      if (from >= prev.length || to > prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      const rawTarget = from < to ? to - 1 : to;
      const target = Math.max(0, Math.min(rawTarget, next.length));
      next.splice(target, 0, item);
      return next;
    });
  };

  const clearDragGhost = () => {
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
    dragOffsetRef.current = null;
  };

  const getTransparentDragImage = () => {
    if (dragImageRef.current) return dragImageRef.current;
    const img = new Image();
    img.src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    dragImageRef.current = img;
    return img;
  };

  const updateDragGhostPosition = (clientX: number, clientY: number) => {
    if (!dragGhostRef.current || !dragOffsetRef.current) return;
    const x = clientX - dragOffsetRef.current.x;
    const y = clientY - dragOffsetRef.current.y;
    dragGhostRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const buildMergedSegments = () => {
    let offset = 0;
    let nextId = 1;
    const merged: SubtitleSegment[] = [];

    mergeFiles.forEach(entry => {
      const fileOffset = offset;
      entry.segments.forEach(seg => {
        const start = secondsToTime(timeToSeconds(seg.startTime) + fileOffset);
        const end = secondsToTime(timeToSeconds(seg.endTime) + fileOffset);
        const outputText = seg.originalText || seg.translatedText || '';
        merged.push({
          ...seg,
          id: nextId++,
          startTime: start,
          endTime: end,
          originalText: outputText,
          translatedText: null,
          errors: [],
          severity: 'safe',
          cps: 0,
          issueList: []
        });
      });
      offset += entry.duration;
    });

    return merged;
  };

  const handleMergeDownload = () => {
    const merged = buildMergedSegments();
    if (merged.length === 0) {
      setMergeError('No segments to merge.');
      return;
    }
    const content = generateSRT(merged, 'original');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalMergeSegments = mergeFiles.reduce((total, entry) => total + entry.segments.length, 0);
  const totalMergeDuration = mergeFiles.reduce((total, entry) => total + entry.duration, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Page Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">{ICONS.Tools}</span>
            File Tools
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage and optimize your subtitle files.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTool !== 'menu' && (
            <button
              type="button"
              onClick={() => setActiveTool('menu')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              Back to Tools
            </button>
          )}
          {activeTool === 'split' && (
            <button 
              onClick={() => setShowSplitConfig(true)}
              disabled={!props.fileName}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {ICONS.Split} Configure Split
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto no-scrollbar ${activeTool === 'menu' ? 'p-0' : 'p-4 sm:p-8'}`}>
        {activeTool === 'menu' && (
          <div className="w-full px-4 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-none">
              <button
                type="button"
                onClick={() => setActiveTool('split')}
                className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 text-left hover:border-blue-500/40 transition-all group w-full h-full"
              >
                <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mb-5">
                  {ICONS.Split}
                </div>
                <h3 className="text-lg font-bold text-slate-200">Split SRT</h3>
                <p className="text-sm text-slate-500 mt-2">Split an SRT by duration, line count, or manual markers.</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('merge')}
                className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 text-left hover:border-emerald-500/40 transition-all group w-full h-full"
              >
                <div className="w-14 h-14 bg-emerald-600/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-5">
                  {ICONS.Export}
                </div>
                <h3 className="text-lg font-bold text-slate-200">Combine SRT</h3>
                <p className="text-sm text-slate-500 mt-2">Merge multiple SRT files into a single output.</p>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8 w-full">

          {activeTool === 'split' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Split SRT Engine
                </h3>
              </div>

              {!props.fileName ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-12 text-center space-y-5 sm:space-y-6 animate-in fade-in duration-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                    {ICONS.Split}
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-bold text-slate-300">No project loaded</h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      Upload an SRT or SKT project before using Split.
                    </p>
                  </div>
                </div>
              ) : props.generatedFiles.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-12 text-center space-y-5 sm:space-y-6 animate-in fade-in duration-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                    {ICONS.Split}
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-bold text-slate-300">No split files yet</h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      Use the Split tool to divide the file into smaller parts by duration or line count.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowSplitConfig(true)}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-2xl transition-all"
                  >
                    Start splitting
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  {props.generatedFiles.map((file, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 hover:border-blue-500/30 transition-all group flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl">
                            {ICONS.File}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                              onClick={() => props.onDeleteGenerated(idx)}
                              className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                            >
                              {ICONS.Delete}
                            </button>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 line-clamp-2 leading-tight">{file.fileName}</h4>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>{file.segments.length} segments</span>
                            {file.metadata?.duration && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span>{file.metadata.duration}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-8">
                        <button 
                          onClick={() => props.onLoadGenerated(file)}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                        >
                          Load into Editor
                        </button>
                        <button 
                          onClick={() => props.onDownloadGenerated(file)}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                        >
                          {ICONS.Export} Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTool === 'merge' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Merge SRT Files
                </h3>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-slate-200">Combine multiple SRT files</h4>
                    <p className="text-slate-500 text-sm mt-1">Add files, arrange order, then export a single merged SRT.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={mergeInputRef}
                      type="file"
                      accept=".srt"
                      multiple
                      className="hidden"
                      onChange={(e) => addMergeFiles(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => mergeInputRef.current?.click()}
                      disabled={mergeLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {mergeLoading ? 'Loading...' : 'Add Files'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMergeFiles([]); setMergeError(null); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      Clear List
                    </button>
                  </div>
                </div>

                {mergeError && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                    {mergeError}
                  </div>
                )}

                {mergeFiles.length === 0 ? (
                  <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-500 text-sm">
                    No files selected yet. Add multiple `.srt` files to merge.
                  </div>
                ) : (
                  <div
                    className="space-y-3"
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      updateDragGhostPosition(e.clientX, e.clientY);
                    }}
                  >
                    {mergeFiles.map((entry, idx) => (
                      <div
                        key={entry.id}
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(idx));
                          const node = e.currentTarget as HTMLDivElement;
                          const rect = node.getBoundingClientRect();
                          const ghost = node.cloneNode(true) as HTMLDivElement;
                          ghost.style.width = `${rect.width}px`;
                          ghost.style.position = 'absolute';
                          ghost.style.top = '0';
                          ghost.style.left = '0';
                          ghost.style.pointerEvents = 'none';
                          ghost.style.opacity = '1';
                          ghost.style.filter = 'none';
                          ghost.style.backgroundColor = '#0f172a';
                          ghost.style.borderColor = '#334155';
                          ghost.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
                          ghost.style.transform = 'scale(1)';
                          ghost.style.zIndex = '9999';
                          ghost.style.margin = '0';
                          ghost.style.willChange = 'transform';
                          document.body.appendChild(ghost);
                          dragGhostRef.current = ghost;
                          const offsetX = e.clientX - rect.left;
                          const offsetY = e.clientY - rect.top;
                          dragOffsetRef.current = { x: offsetX, y: offsetY };
                          updateDragGhostPosition(e.clientX, e.clientY);
                          e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          updateDragGhostPosition(e.clientX, e.clientY);
                          if (dragIndex === null) return;
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const midpoint = rect.top + rect.height / 2;
                          const insertIndex = e.clientY < midpoint ? idx : idx + 1;
                          const nextIndex = insertIndex > dragIndex ? insertIndex - 1 : insertIndex;
                          if (nextIndex === dragIndex) return;
                          moveMergeFileTo(dragIndex, insertIndex);
                          setDragIndex(nextIndex);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null) {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const midpoint = rect.top + rect.height / 2;
                            const insertIndex = e.clientY < midpoint ? idx : idx + 1;
                            moveMergeFileTo(dragIndex, insertIndex);
                          }
                          setDragIndex(null);
                          clearDragGhost();
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          clearDragGhost();
                        }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl px-4 py-3 ${dragIndex === idx ? 'ring-2 ring-emerald-500/40 border-emerald-500/40 border-dashed bg-slate-800/20' : ''}`}
                      >
                        <div className={`space-y-1 ${dragIndex === idx ? 'opacity-0' : ''}`}>
                          <div className="text-sm font-bold text-slate-200 break-all">{entry.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex flex-wrap gap-3">
                            <span>{entry.segments.length} segments</span>
                            <span>Duration {formatDurationHMS(entry.duration)}</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${dragIndex === idx ? 'opacity-0' : ''}`}>
                          <button
                            type="button"
                            onClick={() => removeMergeFile(idx)}
                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    {mergeFiles.length} files • {totalMergeSegments} segments • {formatDurationHMS(totalMergeDuration)}
                  </div>
                  <button
                    type="button"
                    onClick={handleMergeDownload}
                    disabled={mergeFiles.length === 0}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Merge & Export
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {showSplitConfig && (
        <SplitModal 
          onClose={() => setShowSplitConfig(false)} 
          onConfirm={props.onSplitConfirm} 
          totalSegments={props.totalSegments} 
          segments={props.segments}
        />
      )}
    </div>
  );
};

export default FileToolsPage;
