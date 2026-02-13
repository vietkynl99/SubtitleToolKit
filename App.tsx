import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  Status, 
  SubtitleSegment, 
  AnalysisResult, 
  AppSettings, 
  ProjectHistory,
  Severity,
  SplitMetadata
} from './types';
import { 
  parseSRT, 
  analyzeSegments, 
  performLocalFix, 
  generateSRT,
  splitByCount,
  splitByDuration,
  splitByManual,
  splitByRange,
  SplitResult,
  timeToSeconds
} from './services/subtitleLogic';
import { 
  translateSegments, 
  aiFixSegments 
} from './services/geminiService';
import Layout from './components/Layout';
import SegmentList from './components/SegmentList';
import AnalyzerPanel from './components/AnalyzerPanel';
import SplitModal from './components/SplitModal';
import { ICONS, DEFAULT_SETTINGS } from './constants';

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filter, setFilter] = useState<any>('all');
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [generatedFiles, setGeneratedFiles] = useState<SplitResult[]>([]);
  
  const dropzoneRef = useRef<HTMLLabelElement>(null);

  // Load history & settings on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('subtitle_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedSettings = localStorage.getItem('subtitle_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('subtitle_settings', JSON.stringify(settings));
  }, [settings]);

  // Derived state - Analysis
  const analysis = useMemo(() => {
    return analyzeSegments(segments, 'translatedText', settings.safeThreshold, settings.criticalThreshold);
  }, [segments, settings.safeThreshold, settings.criticalThreshold]);

  // v1.7.0 Derived Duration for Header
  const totalDurationStr = useMemo(() => {
    if (segments.length === 0) return '0m 0s';
    const last = segments[segments.length - 1];
    const totalSec = timeToSeconds(last.endTime);
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}m ${s}s`;
  }, [segments]);
  
  const filteredSegments = useMemo(() => {
    if (filter === 'all') return segments;
    if (typeof filter === 'string') {
      return segments.filter(s => s.severity === filter);
    }
    if (filter.type === 'range') {
      return segments.filter(s => s.cps >= filter.min && s.cps < filter.max);
    }
    return segments;
  }, [segments, filter]);

  // Toast Helper
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Đã copy tên file vào clipboard");
  };

  // Save history helper
  const saveToHistory = useCallback((segs: SubtitleSegment[], name: string) => {
    const newEntry: ProjectHistory = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      segments: segs
    };
    const updated = [newEntry, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('subtitle_history', JSON.stringify(updated));
  }, [history]);

  // Consolidated File Processing
  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.srt')) {
      alert('Vui lòng chọn file định dạng .srt');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng file vượt quá 5MB');
      setStatus('error');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setStatus('processing');
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSRT(content);
      
      if (parsed.length === 0) {
        alert('File không có segment hợp lệ hoặc sai định dạng');
        setStatus('error');
        return;
      }

      if (settings.autoFixOnUpload) {
        const fixed = parsed.map(s => ({ ...s, originalText: performLocalFix(s.originalText) }));
        setSegments(fixed);
      } else {
        setSegments(parsed);
      }
      
      setProgress(100);
      setStatus('success');
      setActiveTab('editor');
      setGeneratedFiles([]);
    };
    reader.onerror = () => {
      setStatus('error');
      alert('Lỗi khi đọc file');
    };
    reader.readAsText(file);
  }, [settings.autoFixOnUpload]);

  // Clear Project Implementation (v1.5.0)
  const performClear = async (skipFeedback = false) => {
    setStatus('clearing');
    await new Promise(resolve => setTimeout(resolve, 800));
    setSegments([]);
    setGeneratedFiles([]);
    setFileName('');
    setFileSize(0);
    setProgress(0);
    setStatus('idle');
    setFilter('all');
    setSelectedId(null);
    setShowClearModal(false);
    setActiveTab('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!skipFeedback) showToast("Project đã được xóa.");
  };

  const handleClearProject = () => {
    const hasModifications = segments.some(s => s.isModified);
    if (hasModifications || segments.length > 0) {
      setShowClearModal(true);
    } else {
      performClear();
    }
  };

  const handleReplaceConfirm = async () => {
    if (!pendingFile) return;
    setShowReplaceModal(false);
    await performClear(true);
    processFile(pendingFile);
    setPendingFile(null);
  };

  const handleNewUploadTrigger = (file: File) => {
    if (segments.length > 0) {
      setPendingFile(file);
      setShowReplaceModal(true);
    } else {
      processFile(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleNewUploadTrigger(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleNewUploadTrigger(file);
  };

  const handleTranslate = async () => {
    if (segments.length === 0) return;
    
    const needingTranslation = segments.filter(s => !s.translatedText || s.translatedText.trim() === '');
    if (needingTranslation.length === 0) {
      showToast("Tất cả segment đã có bản dịch.");
      return;
    }

    setStatus('processing');
    setProgress(5);
    
    try {
      await translateSegments(
        segments, 
        (startIndex, count) => {
          // Set isProcessing to true for the current batch indices that are actually being translated
          setSegments(prev => {
            const next = [...prev];
            // The service passes real start index of the batch relative to full array
            // We set isProcessing for 'count' items starting at startIndex
            // In translateSegments v1.2.0, count is batchSize (15) or remainder
            for (let i = startIndex; i < startIndex + count; i++) {
              if (next[i] && (!next[i].translatedText || next[i].translatedText === '')) {
                next[i] = { ...next[i], isProcessing: true };
              }
            }
            return next;
          });
        },
        (batchRelativeStart, translatedBatch) => {
          setSegments(prev => {
            const next = [...prev];
            // We need to re-find which segments were actually translated if we want pinpoint accuracy
            // but translateSegments already updates 'results' array which is returned at the end.
            // The callback here is mainly for progress and immediate UI update.
            // For simplicity, translateSegments already handles the object update.
            return next;
          });
          
          // v1.2.0: Progress based on items requiring translation
          const totalToTranslate = needingTranslation.length;
          const processedCount = batchRelativeStart + translatedBatch.length;
          setProgress(Math.floor((processedCount / totalToTranslate) * 100));
        }
      );
      
      setProgress(100);
      setStatus('success');
      showToast("Đã hoàn thành dịch toàn bộ.");
    } catch (err) {
      setStatus('error');
      showToast("Có lỗi xảy ra khi dịch.");
    }
  };

  const handleAiFix = async () => {
    if (segments.length === 0) return;
    setStatus('processing');
    setProgress(50);
    
    try {
      const fixed = await aiFixSegments(segments);
      setSegments(fixed);
      setProgress(100);
      setStatus('success');
      showToast("AI đã tối ưu xong.");
    } catch (err) {
      setStatus('error');
      showToast("Lỗi AI Fix.");
    }
  };

  const handleLocalFixAll = () => {
    const fixed = segments.map(s => ({
      ...s,
      translatedText: performLocalFix(s.translatedText || s.originalText),
      isModified: true
    }));
    setSegments(fixed);
    showToast("Đã sửa nhanh định dạng.");
  };

  const downloadSRT = (segs: SubtitleSegment[], name: string, metadata?: SplitMetadata) => {
    const srt = generateSRT(segs, metadata);
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadSRT(segments, `optimized_${fileName || 'subtitles.srt'}`);
    saveToHistory(segments, fileName || 'Exported Project');
  };

  const handleSplitConfirm = async (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 600));

    let results: SplitResult[] = [];
    if (mode === 'duration') results = splitByDuration(segments, value as number, fileName, includeMetadata);
    else if (mode === 'count') results = splitByCount(segments, value as number, fileName, includeMetadata);
    else if (mode === 'manual') results = splitByManual(segments, (value as string).split('\n').filter(x => x.trim()), fileName, includeMetadata);
    else if (mode === 'range') results = splitByRange(segments, value.start, value.end, fileName, includeMetadata);

    if (results.length > 0) {
      setGeneratedFiles(prev => [...prev, ...results]);
    }
  };

  const handleDownloadGenerated = (file: SplitResult) => {
    downloadSRT(file.segments, file.fileName, file.metadata);
  };

  const handleLoadGenerated = (file: SplitResult) => {
    if (confirm(`Bạn có muốn tải file "${file.fileName}" vào Editor để làm việc không?\nProject hiện tại sẽ bị thay thế.`)) {
      setFileName(file.fileName);
      setSegments(file.segments);
      setSelectedId(null);
      setFilter('all');
      showToast(`Đã nạp file: ${file.fileName}`);
    }
  };

  const handleDeleteGenerated = (idx: number) => {
    setGeneratedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSegmentText = (id: number, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translatedText: text, isModified: true } : s));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateThreshold = (key: 'safeThreshold' | 'criticalThreshold', val: number) => {
    const newSettings = { ...settings, [key]: val };
    if (key === 'safeThreshold' && val >= newSettings.criticalThreshold - 5) {
      newSettings.criticalThreshold = val + 5;
    } else if (key === 'criticalThreshold' && val <= newSettings.safeThreshold + 5) {
      newSettings.safeThreshold = Math.max(0, val - 5);
    }
    setSettings(newSettings);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress}>
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-700 px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
            {ICONS.Success} {toast.message}
          </p>
        </div>
      )}

      {/* Confirmation Modals */}
      {showClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-3">Xác nhận xóa dự án?</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Bạn có chắc muốn xóa project hiện tại? Mọi thay đổi chưa export sẽ bị mất.
            </p>
            <div className="flex gap-3">
              <button disabled={status === 'clearing'} onClick={() => setShowClearModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-400 bg-slate-800 rounded-xl transition-all hover:bg-slate-700">Hủy</button>
              <button disabled={status === 'clearing'} onClick={() => performClear()} className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl transition-all hover:bg-rose-500">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-3">Tải lên file mới?</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Bạn đang có một project đang mở. Mọi thay đổi chưa export sẽ bị mất nếu bạn nạp file mới.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowReplaceModal(false); setPendingFile(null); }} className="flex-1 py-3 text-sm font-bold text-slate-400 bg-slate-800 rounded-xl transition-all hover:bg-slate-700">Hủy</button>
              <button onClick={handleReplaceConfirm} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl transition-all hover:bg-blue-500">Confirm & Upload</button>
            </div>
          </div>
        </div>
      )}

      {showSplitModal && (
        <SplitModal 
          onClose={() => setShowSplitModal(false)} 
          onConfirm={handleSplitConfirm} 
          totalSegments={segments.length} 
          segments={segments}
        />
      )}

      {/* Global File Header */}
      {status === 'success' && segments.length > 0 && fileName && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-300 z-20">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg shrink-0">{ICONS.File}</div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-slate-100 truncate cursor-pointer" onClick={() => copyToClipboard(fileName)}>{fileName}</h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{segments.length} segments</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{totalDurationStr}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>UTF-8</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/50" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">Subtitle Toolkit</h1>
            <p className="text-slate-400 mb-12">Dịch và tối ưu phụ đề chuyên nghiệp</p>
            <label ref={dropzoneRef} className={`relative group flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${isDragging ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
              <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} />
              <div className="p-6 bg-blue-600/10 rounded-full border border-blue-500/20 mb-6">{ICONS.Upload}</div>
              <p className="text-xl font-bold text-slate-200">Kéo thả file SRT hoặc click để chọn</p>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'editor' && segments.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area: Wide Segment Card List (Requirement v1.8.0) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <SegmentList 
              segments={filteredSegments} 
              selectedId={selectedId} 
              onSelect={setSelectedId}
              onUpdateText={updateSegmentText}
              filter={filter}
              onFilterChange={setFilter}
              safeThreshold={settings.safeThreshold}
              criticalThreshold={settings.criticalThreshold}
            />

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={handleTranslate} disabled={status === 'processing'} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg transition-all hover:bg-blue-500 disabled:opacity-50">
                    {status === 'processing' ? <div className="animate-spin">{ICONS.Retry}</div> : ICONS.Translate} AI Dịch Toàn Bộ
                  </button>
                  <button onClick={handleAiFix} disabled={status === 'processing'} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm font-bold rounded-lg transition-all hover:bg-slate-700">
                    {ICONS.Fix} AI Tối Ưu
                  </button>
                  <button onClick={handleLocalFixAll} className="px-4 py-2 border border-slate-700 text-slate-400 text-sm font-bold rounded-lg transition-all hover:bg-slate-800">Sửa Nhanh</button>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-emerald-500">
                  {ICONS.Export} Xuất File SRT
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Dashboard / Analyzer (Requirement v1.8.0) */}
          <div className="w-80 flex flex-col border-l border-slate-800 bg-slate-900">
             <AnalyzerPanel 
                data={analysis} 
                activeFilter={filter} 
                onFilterTrigger={setFilter} 
                safeThreshold={settings.safeThreshold}
                criticalThreshold={settings.criticalThreshold}
                onOpenSplit={() => setShowSplitModal(true)}
                onClearProject={handleClearProject}
                generatedFiles={generatedFiles}
                onDownloadGenerated={handleDownloadGenerated}
                onLoadGenerated={handleLoadGenerated}
                onDeleteGenerated={handleDeleteGenerated}
             />
          </div>
        </div>
      )}

      {/* History & Settings */}
      {activeTab === 'history' && (
        <div className="flex-1 p-12 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-8">Dự án gần đây</h2>
          {history.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-500">Chưa có lịch sử.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all">
                  <h3 className="font-bold text-slate-100 mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{new Date(item.timestamp).toLocaleString()}</p>
                  <button onClick={() => { setSegments(item.segments); setFileName(item.name); setActiveTab('editor'); setStatus('success'); }} className="text-xs font-bold text-blue-400 hover:underline">Tải Dự Án</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-12 max-w-4xl overflow-y-auto">
          <h2 className="text-3xl font-bold mb-8">Cài đặt</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-xl">
            <div>
              <h3 className="font-bold mb-2">Safe Threshold</h3>
              <input type="range" min="10" max="60" value={settings.safeThreshold} onChange={(e) => updateThreshold('safeThreshold', Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer" />
              <span className="text-blue-400 font-bold">{settings.safeThreshold} CPS</span>
            </div>
            <div>
              <h3 className="font-bold mb-2">Critical Threshold</h3>
              <input type="range" min="15" max="80" value={settings.criticalThreshold} onChange={(e) => updateThreshold('criticalThreshold', Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-rose-500 cursor-pointer" />
              <span className="text-rose-400 font-bold">{settings.criticalThreshold} CPS</span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;