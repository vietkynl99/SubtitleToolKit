import { 
  parseSRT, 
  parseSktProject,
  generateSktProject,
  analyzeSegments, 
  performLocalFix, 
  generateSRT,
  splitByCount,
  splitByDuration,
  splitByManual,
  splitByRange,
  SplitResult,
  timeToSeconds,
  parseFileName,
  generateExportFileName
} from './services/subtitleLogic';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  Status, 
  SubtitleSegment, 
  AnalysisResult, 
  AppSettings, 
  Severity,
  SplitMetadata,
  TranslationPreset,
  ApiUsage
} from './types';
import { 
  translateBatch,
  aiFixSegments,
  extractTitleFromFilename,
  translateTitle,
  analyzeTranslationStyle
} from './services/geminiService';
import Layout from './components/Layout';
import SegmentList from './components/SegmentList';
import AnalyzerPanel from './components/AnalyzerPanel';
import FileToolsPage from './components/FileToolsPage';
import PresetPage from './components/PresetPage';
import { ICONS, DEFAULT_SETTINGS } from './constants';

const INITIAL_USAGE: ApiUsage = {
  style: { requests: 0, tokens: 0 },
  translate: { requests: 0, tokens: 0, segments: 0 },
  optimize: { requests: 0, tokens: 0 }
};

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [fileName, setFileName] = useState<string>('');
  const [baseFileName, setBaseFileName] = useState<string>('');
  const [editedCount, setEditedCount] = useState<number>(0);
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);

  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filter, setFilter] = useState<any>('all');
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [generatedFiles, setGeneratedFiles] = useState<SplitResult[]>([]);
  
  const [apiUsage, setApiUsage] = useState<ApiUsage>(INITIAL_USAGE);
  const [translationPreset, setTranslationPreset] = useState<TranslationPreset | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState<boolean>(false);

  const [translationState, setTranslationState] = useState<{
    status: 'idle' | 'running' | 'stopped' | 'error' | 'completed';
    processed: number;
    total: number;
  }>({ status: 'idle', processed: 0, total: 0 });
  
  const stopRequestedRef = useRef<boolean>(false);
  const dropzoneRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (baseFileName) {
      setFileName(generateExportFileName(baseFileName, editedCount));
    }
  }, [baseFileName, editedCount]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('subtitle_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('subtitle_settings', JSON.stringify(settings));
  }, [settings]);

  const globalAnalysis = useMemo(() => {
    if (segments.length === 0) return null;
    return analyzeSegments(segments, 'translatedText', settings.cpsThreshold);
  }, [segments, settings.cpsThreshold]);

  const processedSegments = useMemo(() => globalAnalysis?.enrichedSegments || [], [globalAnalysis]);
  const allStats = useMemo(() => globalAnalysis?.stats, [globalAnalysis]);

  const filteredSegments = useMemo(() => {
    if (filter === 'all') return processedSegments;
    if (typeof filter === 'string') {
      return processedSegments.filter(s => s.severity === filter);
    }
    if (filter.type === 'range') {
      return processedSegments.filter(s => s.cps >= filter.min && s.cps < filter.max);
    }
    return processedSegments;
  }, [processedSegments, filter]);

  const totalDurationStr = useMemo(() => {
    if (processedSegments.length === 0) return '0m 0s';
    const first = processedSegments[0];
    const last = processedSegments[processedSegments.length - 1];
    const totalSec = Math.max(0, timeToSeconds(last.endTime) - timeToSeconds(first.startTime));
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}m ${s}s`;
  }, [processedSegments]);
  
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Đã copy tên file vào clipboard");
  };

  const handleGeneratePreset = async (fName: string) => {
    if (!fName) return;
    setIsPresetLoading(true);
    let totalTokens = 0;
    let totalRequests = 0;

    try {
      const { title: extracted, tokens: tokens1 } = await extractTitleFromFilename(fName);
      totalTokens += tokens1;
      totalRequests += 1;

      let titleVi = extracted;
      const isCn = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);
      if (isCn(extracted)) {
        const { title: translated, tokens: tokens2 } = await translateTitle(extracted);
        titleVi = translated;
        totalTokens += tokens2;
        totalRequests += 1;
      }
      
      const { preset, tokens: tokens3 } = await analyzeTranslationStyle(titleVi, extracted);
      totalTokens += tokens3;
      totalRequests += 1;

      setTranslationPreset(preset);
      setApiUsage(prev => ({
        ...prev,
        style: {
          requests: prev.style.requests + totalRequests,
          tokens: prev.style.tokens + totalTokens
        }
      }));

      showToast("Analyze Complete: Creative DNA initialized.");
    } catch (err) {
      console.error("Preset generation failed", err);
      showToast("Không thể phân tích phong cách tự động.");
    } finally {
      setIsPresetLoading(false);
    }
  };

  const handleExportPreset = () => {
    if (!translationPreset) return;
    const blob = new Blob([JSON.stringify(translationPreset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[Preset] ${translationPreset.title_original}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const isValid = json.title_original && 
                        json.title_vi && 
                        Array.isArray(json.genres) && 
                        Array.isArray(json.tone) && 
                        typeof json.humor_level === 'number';

        if (isValid) {
          setTranslationPreset(json);
          showToast("Preset DNA successfully imported.");
        } else {
          showToast("File preset không hợp lệ hoặc sai Version.");
        }
      } catch (err) {
        showToast("Lỗi khi đọc file preset.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.srt') && !ext.endsWith('.sktproject')) {
      alert('Vui lòng chọn file định dạng .srt hoặc .sktproject');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng file vượt quá 5MB');
      setStatus('error');
      return;
    }

    const { baseName, editedCount: count } = parseFileName(file.name);
    setBaseFileName(baseName);
    setEditedCount(count);

    setFileSize(file.size);
    setStatus('processing');
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      try {
        let parsedSegments: SubtitleSegment[] = [];
        let preset: TranslationPreset | null = null;

        if (ext.endsWith('.srt')) {
          parsedSegments = parseSRT(content);
          setProjectCreatedAt(new Date().toISOString());
        } else {
          const res = parseSktProject(content);
          parsedSegments = res.segments;
          preset = res.preset;
          setProjectCreatedAt(null); // Will use stored created_at on next save
        }
        
        if (parsedSegments.length === 0) {
          alert('File không có segment hợp lệ hoặc sai định dạng');
          setStatus('error');
          return;
        }

        if (settings.autoFixOnUpload) {
          parsedSegments = parsedSegments.map(s => ({ ...s, originalText: performLocalFix(s.originalText || "") }));
        }

        setSegments(parsedSegments);
        setTranslationPreset(preset);
        setTranslationState({ status: 'idle', processed: 0, total: 0 });
        setApiUsage(INITIAL_USAGE);
        setProgress(100);
        setStatus('success');
        setActiveTab('editor');
        setGeneratedFiles([]);
        setFilter('all');
      } catch (err) {
        alert('Lỗi khi parse file: ' + (err as Error).message);
        setStatus('error');
      }
    };
    reader.onerror = () => {
      setStatus('error');
      alert('Lỗi khi đọc file');
    };
    reader.readAsText(file);
  }, [settings.autoFixOnUpload]);

  const performClear = async (skipFeedback = false) => {
    setStatus('clearing');
    await new Promise(resolve => setTimeout(resolve, 800));
    setSegments([]);
    setGeneratedFiles([]);
    setTranslationPreset(null);
    setTranslationState({ status: 'idle', processed: 0, total: 0 });
    setApiUsage(INITIAL_USAGE);
    setFileName('');
    setBaseFileName('');
    setEditedCount(0);
    setFileSize(0);
    setProgress(0);
    setStatus('idle');
    setFilter('all');
    setSelectedId(null);
    setShowClearModal(false);
    setActiveTab('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!skipFeedback) showToast("Project has been cleared.");
  };

  const handleClearProjectRequest = () => {
    setShowClearModal(true);
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
      showToast("Tất cả các dòng đã được dịch. Không cần dịch thêm.");
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      return;
    }
    if (!translationPreset) {
      showToast("Vui lòng cấu hình Translation Style trước.");
      setActiveTab('translation-style');
      return;
    }
    setStatus('processing');
    stopRequestedRef.current = false;
    const totalToTranslateInSession = needingTranslation.length;
    setTranslationState({ status: 'running', processed: 0, total: totalToTranslateInSession });
    setProgress(0);
    let completedInSession = 0;
    try {
      const batchSize = settings.translationBatchSize || 100;
      for (let i = 0; i < needingTranslation.length; i += batchSize) {
        if (stopRequestedRef.current) {
          setTranslationState(prev => ({ ...prev, status: 'stopped' }));
          showToast("Đã dừng quá trình dịch.");
          setStatus('success');
          return;
        }
        const currentBatch = needingTranslation.slice(i, i + batchSize);
        const firstIdx = segments.findIndex(s => s.id === currentBatch[0].id);
        const lastIdx = segments.findIndex(s => s.id === currentBatch[currentBatch.length - 1].id);
        const contextBefore = segments.slice(Math.max(0, firstIdx - 2), firstIdx).map(s => s.originalText || "");
        const contextAfter = segments.slice(lastIdx + 1, Math.min(segments.length, lastIdx + 3)).map(s => s.originalText || "");
        setSegments(prev => prev.map(s => currentBatch.some(cb => cb.id === s.id) ? { ...s, isProcessing: true } : s));
        const { translatedTexts, tokens } = await translateBatch(currentBatch, contextBefore, contextAfter, translationPreset);
        setSegments(prev => prev.map(s => {
          const bIdx = currentBatch.findIndex(cb => cb.id === s.id);
          if (bIdx !== -1) return { ...s, translatedText: translatedTexts[bIdx], isModified: true, isProcessing: false };
          return s;
        }));
        completedInSession += currentBatch.length;
        setApiUsage(prev => ({ ...prev, translate: { requests: prev.translate.requests + 1, tokens: prev.translate.tokens + tokens, segments: (prev.translate.segments || 0) + currentBatch.length } }));
        setTranslationState(prev => ({ ...prev, processed: completedInSession }));
        setProgress(Math.floor((completedInSession / totalToTranslateInSession) * 100));
      }
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      setStatus('success');
      showToast("Dịch hoàn tất.");
    } catch (err: any) {
      setStatus('error');
      setTranslationState(prev => ({ ...prev, status: 'error' }));
      showToast(`Lỗi: ${err.message}`);
      setSegments(prev => prev.map(s => ({ ...s, isProcessing: false })));
    }
  };

  const handleStopTranslate = () => { stopRequestedRef.current = true; showToast("Đang dừng..."); };

  const handleAiFix = async () => {
    if (segments.length === 0) return;
    setStatus('processing');
    setProgress(50);
    try {
      const { segments: fixed, tokens } = await aiFixSegments(segments);
      setSegments(fixed);
      setApiUsage(prev => ({ ...prev, optimize: { requests: prev.optimize.requests + 1, tokens: prev.optimize.tokens + tokens } }));
      setProgress(100);
      setStatus('success');
      showToast("AI Fix completed.");
    } catch (err) {
      setStatus('error');
      showToast("Lỗi AI Fix.");
    }
  };

  const downloadFile = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadChoice = (type: 'project' | 'srt-orig' | 'srt-tran') => {
    setShowExportModal(false);
    if (type === 'project') {
      const json = generateSktProject(segments, baseFileName, translationPreset, projectCreatedAt || undefined);
      const name = generateExportFileName(baseFileName, editedCount, '.sktproject');
      downloadFile(json, name);
      setEditedCount(prev => prev + 1);
      showToast("Project saved.");
    } else if (type === 'srt-orig') {
      const srt = generateSRT(segments, 'original');
      const name = generateExportFileName(baseFileName, editedCount, '.srt');
      downloadFile(srt, name);
      setEditedCount(prev => prev + 1);
      showToast("Original SRT exported.");
    } else if (type === 'srt-tran') {
      const srt = generateSRT(segments, 'translated');
      const name = generateExportFileName(baseFileName, editedCount, '.srt');
      downloadFile(srt, name);
      setEditedCount(prev => prev + 1);
      showToast("Translated SRT exported.");
    }
  };

  const handleSplitConfirm = async (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    let res: SplitResult[] = [];
    if (mode === 'duration') res = splitByDuration(segments, value as number, fileName, includeMetadata);
    else if (mode === 'count') res = splitByCount(segments, value as number, fileName, includeMetadata);
    else if (mode === 'manual') res = splitByManual(segments, (value as string).split('\n').filter(x => x.trim()), fileName, includeMetadata);
    else if (mode === 'range') res = splitByRange(segments, value.start, value.end, fileName, includeMetadata);
    if (res.length > 0) { setGeneratedFiles(prev => [...prev, ...res]); showToast(`Đã chia file thành ${res.length} phần.`); }
  };

  const handleDownloadGenerated = (file: SplitResult) => {
    const { baseName, editedCount: count } = parseFileName(file.fileName);
    const srt = generateSRT(file.segments, 'translated', file.metadata);
    downloadFile(srt, generateExportFileName(baseName, count));
  };

  const handleLoadGenerated = (file: SplitResult) => {
    if (confirm(`Nạp file "${file.fileName}" vào Editor?`)) {
      setFileName(file.fileName);
      const { baseName, editedCount: count } = parseFileName(file.fileName);
      setBaseFileName(baseName);
      setEditedCount(count);
      setSegments(file.segments);
      setSelectedId(null);
      setFilter('all');
      setActiveTab('editor');
    }
  };

  // Add missing handleDeleteGenerated function
  const handleDeleteGenerated = (index: number) => {
    setGeneratedFiles(prev => prev.filter((_, i) => i !== index));
    showToast("Đã xóa file tạm thời.");
  };

  const updateSegmentText = (id: number, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translatedText: text, isModified: true } : s));
  };

  const updateThreshold = (key: 'safeMax' | 'warningMax', val: number) => {
    setSettings(prev => {
      const nt = { ...prev.cpsThreshold, [key]: val };
      if (key === 'safeMax' && val >= nt.warningMax - 5) nt.warningMax = val + 5;
      else if (key === 'warningMax' && val <= nt.safeMax + 5) nt.safeMax = Math.max(0, val - 5);
      return { ...prev, cpsThreshold: nt };
    });
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress} hasProject={segments.length > 0} onClearProject={handleClearProjectRequest}>
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-700 px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-sm font-bold text-blue-400 flex items-center gap-2">{ICONS.Success} {toast.message}</p>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-3">Xóa dự án?</h3>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowClearModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl">Hủy</button>
              <button onClick={() => performClear()} className="flex-1 py-3 bg-rose-600 rounded-xl">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-3">Tải lên file mới?</h3>
            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowReplaceModal(false); setPendingFile(null); }} className="flex-1 py-3 bg-slate-800 rounded-xl">Hủy</button>
              <button onClick={handleReplaceConfirm} className="flex-1 py-3 bg-blue-600 rounded-xl">Confirm & Upload</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-2">Tải xuống</h3>
            <p className="text-slate-500 text-sm mb-10">Chọn định dạng và phiên bản bạn muốn lưu trữ.</p>
            <div className="space-y-4">
              <button onClick={() => handleDownloadChoice('project')} className="w-full p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-left hover:bg-blue-600/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-bold text-blue-400">Save Project (.sktproject)</span>
                    <span className="text-[11px] text-slate-500">Lưu toàn bộ trạng thái, preset và text để làm việc tiếp.</span>
                  </div>
                  <span className="text-blue-500 group-hover:translate-x-1 transition-transform">{ICONS.Next}</span>
                </div>
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleDownloadChoice('srt-tran')} className="p-6 bg-emerald-600/10 border border-emerald-500/20 rounded-3xl text-left hover:bg-emerald-600/20 transition-all group">
                  <span className="block font-bold text-emerald-400">Export Translated SRT</span>
                  <span className="text-[10px] text-slate-500">Bản dịch Tiếng Việt</span>
                </button>
                <button onClick={() => handleDownloadChoice('srt-orig')} className="p-6 bg-slate-800 border border-slate-700 rounded-3xl text-left hover:bg-slate-700 transition-all group">
                  <span className="block font-bold text-slate-400">Export Original SRT</span>
                  <span className="text-[10px] text-slate-500">Bản gốc Tiếng Trung</span>
                </button>
              </div>
            </div>
            <button onClick={() => setShowExportModal(false)} className="w-full mt-8 py-4 text-slate-500 font-bold hover:text-slate-300">Đóng</button>
          </div>
        </div>
      )}

      {status === 'success' && segments.length > 0 && fileName && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg shrink-0">{ICONS.File}</div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-slate-100 truncate cursor-pointer" onClick={() => copyToClipboard(fileName)}>{fileName}</h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{processedSegments.length} SEGMENTS</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{allStats?.avgCPS.toFixed(1) || 0} AVG CPS</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{totalDurationStr}</span>
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
            <label className={`relative group flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl cursor-pointer ${isDragging ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-slate-800'}`}>
              <input type="file" accept=".srt,.sktproject" className="hidden" onChange={handleFileUpload} />
              <div className="p-6 bg-blue-600/10 rounded-full border border-blue-500/20 mb-6">{ICONS.Upload}</div>
              <p className="text-xl font-bold text-slate-200">Kéo thả file SRT/SKTPROJECT</p>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'translation-style' && (
        <PresetPage preset={translationPreset} isLoading={isPresetLoading} onReAnalyze={() => handleGeneratePreset(fileName)} onExport={handleExportPreset} onImport={handleImportPreset} onUpdatePreset={setTranslationPreset} fileName={fileName} totalSegments={segments.length} />
      )}

      {activeTab === 'file-tools' && (
        <FileToolsPage fileName={fileName} totalSegments={segments.length} segments={segments} onSplitConfirm={handleSplitConfirm} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
      )}

      {activeTab === 'editor' && segments.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <SegmentList segments={filteredSegments} selectedId={selectedId} onSelect={setSelectedId} onUpdateText={updateSegmentText} filter={filter} onFilterChange={setFilter} safeThreshold={settings.cpsThreshold.safeMax} criticalThreshold={settings.cpsThreshold.warningMax} />
            {translationState.status === 'running' && (
              <div className="px-6 py-2 bg-slate-900 border-t border-slate-800">
                <div className="flex justify-between mb-1.5"><span className="text-[10px] font-bold text-blue-400">Đang dịch: {translationState.processed}/{translationState.total}</span><span>{progress}%</span></div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div></div>
              </div>
            )}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex gap-2">
                {translationState.status === 'running' ? <button onClick={handleStopTranslate} className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold">Stop AI Translation</button> : <button onClick={handleTranslate} disabled={status === 'processing'} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">AI Dịch Toàn Bộ</button>}
                <button onClick={handleAiFix} disabled={status === 'processing'} className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg font-bold">AI Tối Ưu</button>
              </div>
              <button onClick={() => setShowExportModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20">{ICONS.Export} Tải Xuống</button>
            </div>
          </div>
          <div className="w-80 border-l border-slate-800 bg-slate-900">
             <AnalyzerPanel data={allStats || ({} as AnalysisResult)} activeFilter={filter} onFilterTrigger={setFilter} safeThreshold={settings.cpsThreshold.safeMax} criticalThreshold={settings.cpsThreshold.warningMax} onOpenSplit={() => setActiveTab('file-tools')} onClearProject={handleClearProjectRequest} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-12 max-w-4xl overflow-y-auto no-scrollbar">
          <h2 className="text-3xl font-bold mb-8">Cài đặt hệ thống</h2>
          <div className="space-y-8">
            <section className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-xl">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">API Usage Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Style', 'Translate', 'Optimize'].map(key => (
                  <div key={key} className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3">{key}</div>
                    <div className="flex justify-between text-xs mb-1"><span>Req:</span><span>{(apiUsage as any)[key.toLowerCase()].requests}</span></div>
                    <div className="flex justify-between text-xs"><span>Tokens:</span><span>{(apiUsage as any)[key.toLowerCase()].tokens.toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
            </section>
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl">
              <div><h3 className="font-bold mb-2">Safe Max (CPS)</h3><input type="range" min="10" max="60" value={settings.cpsThreshold.safeMax} onChange={(e) => updateThreshold('safeMax', Number(e.target.value))} className="w-full accent-blue-500" /></div>
              <div><h3 className="font-bold mb-2">Warning Max (CPS)</h3><input type="range" min="15" max="80" value={settings.cpsThreshold.warningMax} onChange={(e) => updateThreshold('warningMax', Number(e.target.value))} className="w-full accent-rose-500" /></div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;