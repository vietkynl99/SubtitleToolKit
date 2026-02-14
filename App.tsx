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
  parseSRT, 
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
  
  // File Naming States (v1.0.0 Naming Rules)
  const [fileName, setFileName] = useState<string>('');
  const [baseFileName, setBaseFileName] = useState<string>('');
  const [editedCount, setEditedCount] = useState<number>(0);

  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filter, setFilter] = useState<any>('all');
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [generatedFiles, setGeneratedFiles] = useState<SplitResult[]>([]);
  
  // API Usage Tracking
  const [apiUsage, setApiUsage] = useState<ApiUsage>(INITIAL_USAGE);

  // Translation Style DNA State
  const [translationPreset, setTranslationPreset] = useState<TranslationPreset | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState<boolean>(false);

  // v1.3.0: Detailed Translation State
  const [translationState, setTranslationState] = useState<{
    status: 'idle' | 'running' | 'stopped' | 'error' | 'completed';
    processed: number;
    total: number;
  }>({ status: 'idle', processed: 0, total: 0 });
  
  const stopRequestedRef = useRef<boolean>(false);

  const dropzoneRef = useRef<HTMLLabelElement>(null);

  // Sync displayed fileName state with internal naming states
  // This shows what the *next* export filename will look like
  useEffect(() => {
    if (baseFileName) {
      setFileName(generateExportFileName(baseFileName, editedCount));
    }
  }, [baseFileName, editedCount]);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('subtitle_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('subtitle_settings', JSON.stringify(settings));
  }, [settings]);

  // v1.7.5 logic: Process ALL segments to get enriched data and GLOBAL stats for Dashboard
  const globalAnalysis = useMemo(() => {
    if (segments.length === 0) return null;
    return analyzeSegments(segments, 'translatedText', settings.cpsThreshold);
  }, [segments, settings.cpsThreshold]);

  const processedSegments = useMemo(() => globalAnalysis?.enrichedSegments || [], [globalAnalysis]);
  const allStats = useMemo(() => globalAnalysis?.stats, [globalAnalysis]);

  // Editor-only: Filtered Segments derived from the enriched global list
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

  // Derived Duration for Header (Reflects ALL segments for the file)
  const totalDurationStr = useMemo(() => {
    if (processedSegments.length === 0) return '0m 0s';
    const first = processedSegments[0];
    const last = processedSegments[processedSegments.length - 1];
    const totalSec = Math.max(0, timeToSeconds(last.endTime) - timeToSeconds(first.startTime));
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}m ${s}s`;
  }, [processedSegments]);
  
  // Toast Helper
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Đã copy tên file vào clipboard");
  };

  // DNA Style Generation
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
      
      const isChinese = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);
      if (isChinese(extracted)) {
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

    // v1.0.0 Naming Rules: Parse file name for base and existing count
    const { baseName, editedCount: count } = parseFileName(file.name);
    setBaseFileName(baseName);
    setEditedCount(count);
    // Note: useEffect will update fileName display automatically

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
        const fixed = parsed.map(s => ({ ...s, originalText: performLocalFix(s.originalText || "") }));
        setSegments(fixed);
      } else {
        setSegments(parsed);
      }
      
      setTranslationPreset(null);
      setTranslationState({ status: 'idle', processed: 0, total: 0 });
      setApiUsage(INITIAL_USAGE);
      setProgress(100);
      setStatus('success');
      setActiveTab('editor');
      setGeneratedFiles([]);
      setFilter('all');
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

  // v1.3.0: AI Translation Flow with Stop/Resume and Dynamic Batching
  const handleTranslate = async () => {
    if (segments.length === 0) return;

    // STEP 1: Check if all translated
    const needingTranslation = segments.filter(s => !s.translatedText || s.translatedText.trim() === '');
    if (needingTranslation.length === 0) {
      showToast("Tất cả các dòng đã được dịch. Không cần dịch thêm.");
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      return;
    }

    // STEP 2: Check Preset
    if (!translationPreset) {
      showToast("Vui lòng cấu hình Translation Style trước.");
      setActiveTab('translation-style');
      return;
    }

    setStatus('processing');
    stopRequestedRef.current = false;
    
    const totalToTranslateInSession = needingTranslation.length;
    
    setTranslationState({ 
      status: 'running', 
      processed: 0, 
      total: totalToTranslateInSession 
    });
    setProgress(0);
    
    let completedInSession = 0;

    try {
      const batchSize = settings.translationBatchSize || 100;
      
      for (let i = 0; i < needingTranslation.length; i += batchSize) {
        if (stopRequestedRef.current) {
          setTranslationState(prev => ({ ...prev, status: 'stopped' }));
          showToast("Đã dừng quá trình dịch. Bạn có thể tiếp tục dịch phần còn lại.");
          setStatus('success'); // Re-enable UI
          return;
        }

        const currentBatch = needingTranslation.slice(i, i + batchSize);
        
        const firstSegId = currentBatch[0].id;
        const lastSegId = currentBatch[currentBatch.length - 1].id;
        const firstIdx = segments.findIndex(s => s.id === firstSegId);
        const lastIdx = segments.findIndex(s => s.id === lastSegId);
        const contextBefore = segments.slice(Math.max(0, firstIdx - 2), firstIdx).map(s => s.originalText || "");
        const contextAfter = segments.slice(lastIdx + 1, Math.min(segments.length, lastIdx + 3)).map(s => s.originalText || "");

        setSegments(prev => prev.map(s => 
          currentBatch.some(cb => cb.id === s.id) ? { ...s, isProcessing: true } : s
        ));

        const { translatedTexts, tokens } = await translateBatch(currentBatch, contextBefore, contextAfter, translationPreset);
        
        setSegments(prev => prev.map(s => {
          const batchIdx = currentBatch.findIndex(cb => cb.id === s.id);
          if (batchIdx !== -1) {
            return { 
              ...s, 
              translatedText: translatedTexts[batchIdx], 
              isModified: true, 
              isProcessing: false 
            };
          }
          return s;
        }));

        completedInSession += currentBatch.length;
        
        setApiUsage(prev => ({
          ...prev,
          translate: {
            requests: prev.translate.requests + 1,
            tokens: prev.translate.tokens + tokens,
            segments: (prev.translate.segments || 0) + currentBatch.length
          }
        }));

        setTranslationState(prev => ({ ...prev, processed: completedInSession }));
        setProgress(Math.floor((completedInSession / totalToTranslateInSession) * 100));
      }
      
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      setStatus('success');
      showToast("Dịch hoàn tất.");
    } catch (err: any) {
      setStatus('error');
      setTranslationState(prev => ({ ...prev, status: 'error' }));
      showToast(`Lỗi: ${err.message || 'Có lỗi xảy ra khi dịch.'}`);
      setSegments(prev => prev.map(s => ({ ...s, isProcessing: false })));
    }
  };

  const handleStopTranslate = () => {
    stopRequestedRef.current = true;
    showToast("Đang dừng...");
  };

  const handleAiFix = async () => {
    if (segments.length === 0) return;
    setStatus('processing');
    setProgress(50);
    try {
      const { segments: fixed, tokens } = await aiFixSegments(segments);
      setSegments(fixed);
      setApiUsage(prev => ({
        ...prev,
        optimize: {
          requests: prev.optimize.requests + 1,
          tokens: prev.optimize.tokens + tokens
        }
      }));
      setProgress(100);
      setStatus('success');
      showToast("AI Fix completed.");
    } catch (err) {
      setStatus('error');
      showToast("Lỗi AI Fix.");
    }
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
    // v1.0.0 Naming Rules: Apply [EditedX] prefix at export
    const finalName = generateExportFileName(baseFileName, editedCount);
    downloadSRT(segments, finalName);
    // Increment the export counter for the next save session
    setEditedCount(prev => prev + 1);
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
      showToast(`Đã chia file thành ${results.length} phần.`);
    }
  };

  const handleDownloadGenerated = (file: SplitResult) => {
    // Apply [Edited] logic to split files too
    const { baseName, editedCount: count } = parseFileName(file.fileName);
    const finalName = generateExportFileName(baseName, count);
    downloadSRT(file.segments, finalName, file.metadata);
  };

  const handleLoadGenerated = (file: SplitResult) => {
    if (confirm(`Bạn có muốn tải file "${file.fileName}" vào Editor để làm việc không?\nProject hiện tại sẽ bị thay thế.`)) {
      setFileName(file.fileName);
      const { baseName, editedCount: count } = parseFileName(file.fileName);
      setBaseFileName(baseName);
      setEditedCount(count);
      
      setSegments(file.segments);
      setSelectedId(null);
      setFilter('all');
      setActiveTab('editor');
      showToast(`Đã nạp file: ${file.fileName}`);
    }
  };

  const handleDeleteGenerated = (idx: number) => {
    setGeneratedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSegmentText = (id: number, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translatedText: text, isModified: true } : s));
  };

  const updateThreshold = (key: 'safeMax' | 'warningMax', val: number) => {
    setSettings(prev => {
      const newThreshold = { ...prev.cpsThreshold, [key]: val };
      if (key === 'safeMax' && val >= newThreshold.warningMax - 5) {
        newThreshold.warningMax = val + 5;
      } else if (key === 'warningMax' && val <= newThreshold.safeMax + 5) {
        newThreshold.safeMax = Math.max(0, val - 5);
      }
      return { ...prev, cpsThreshold: newThreshold };
    });
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      progress={progress}
      hasProject={segments.length > 0}
      onClearProject={handleClearProjectRequest}
    >
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-700 px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
            {ICONS.Success} {toast.message}
          </p>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
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

      {status === 'success' && segments.length > 0 && fileName && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-300 z-20">
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
            <label ref={dropzoneRef} className={`relative group flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${isDragging ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-500/10' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
              <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} />
              <div className="p-6 bg-blue-600/10 rounded-full border border-blue-500/20 mb-6">{ICONS.Upload}</div>
              <p className="text-xl font-bold text-slate-200">Kéo thả file SRT hoặc click để chọn</p>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'translation-style' && (
        <PresetPage 
          preset={translationPreset}
          isLoading={isPresetLoading}
          onReAnalyze={() => handleGeneratePreset(fileName)}
          onExport={handleExportPreset}
          onImport={handleImportPreset}
          onUpdatePreset={setTranslationPreset}
          fileName={fileName}
          totalSegments={segments.length}
        />
      )}

      {activeTab === 'file-tools' && (
        <FileToolsPage 
          fileName={fileName}
          totalSegments={segments.length}
          segments={segments}
          onSplitConfirm={handleSplitConfirm}
          generatedFiles={generatedFiles}
          onDownloadGenerated={handleDownloadGenerated}
          onLoadGenerated={handleLoadGenerated}
          onDeleteGenerated={handleDeleteGenerated}
        />
      )}

      {activeTab === 'editor' && segments.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <SegmentList 
              segments={filteredSegments} 
              selectedId={selectedId} 
              onSelect={setSelectedId}
              onUpdateText={updateSegmentText}
              filter={filter}
              onFilterChange={setFilter}
              safeThreshold={settings.cpsThreshold.safeMax}
              criticalThreshold={settings.cpsThreshold.warningMax}
            />
            
            {translationState.status === 'running' && (
              <div className="px-6 py-2 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Đang xử lý: {translationState.processed} / {translationState.total} dòng</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {translationState.status === 'running' ? (
                    <button 
                      onClick={handleStopTranslate} 
                      className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg transition-all hover:bg-rose-500 shadow-lg shadow-rose-500/20"
                    >
                      {ICONS.Delete} Stop AI Translation
                    </button>
                  ) : (
                    <button 
                      onClick={handleTranslate} 
                      disabled={status === 'processing'} 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg transition-all hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      {status === 'processing' && translationState.status !== 'stopped' ? <div className="animate-spin">{ICONS.Retry}</div> : ICONS.Translate} 
                      {translationState.status === 'stopped' ? 'Tiếp tục dịch' : 'AI Dịch Toàn Bộ'}
                    </button>
                  )}
                  
                  <button onClick={handleAiFix} disabled={status === 'processing'} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm font-bold rounded-lg transition-all hover:bg-slate-700">
                    {ICONS.Fix} AI Tối Ưu
                  </button>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-500">
                  {ICONS.Export} Xuất File SRT
                </button>
              </div>
            </div>
          </div>
          <div className="w-80 flex flex-col border-l border-slate-800 bg-slate-900">
             <AnalyzerPanel 
                data={allStats || ({} as AnalysisResult)} 
                activeFilter={filter} 
                onFilterTrigger={setFilter} 
                safeThreshold={settings.cpsThreshold.safeMax}
                criticalThreshold={settings.cpsThreshold.warningMax}
                onOpenSplit={() => setActiveTab('file-tools')}
                onClearProject={handleClearProjectRequest}
                generatedFiles={generatedFiles}
                onDownloadGenerated={handleDownloadGenerated}
                onLoadGenerated={handleLoadGenerated}
                onDeleteGenerated={handleDeleteGenerated}
             />
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
                <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3">Translation Style</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Requests:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.style.requests}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Tokens:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.style.tokens.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-3">AI Translate</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Requests:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.translate.requests}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Tokens:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.translate.tokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
                        <span className="text-xs text-slate-500">Segments:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.translate.segments || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Avg Tokens / Seg:</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {apiUsage.translate.segments && apiUsage.translate.segments > 0 
                            ? (apiUsage.translate.tokens / apiUsage.translate.segments).toFixed(1) 
                            : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-3">AI Optimize</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Requests:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.optimize.requests}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Tokens:</span>
                        <span className="text-sm font-bold text-slate-200">{apiUsage.optimize.tokens.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl">
              <div>
                <h3 className="font-bold mb-2">Safe Max (CPS)</h3>
                <input 
                  type="range" min="10" max="60" 
                  value={settings.cpsThreshold.safeMax} 
                  onChange={(e) => updateThreshold('safeMax', Number(e.target.value))} 
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer" 
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-blue-400 font-bold">{settings.cpsThreshold.safeMax} CPS</span>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Low Speed limit</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Warning Max (CPS)</h3>
                <input 
                  type="range" min="15" max="80" 
                  value={settings.cpsThreshold.warningMax} 
                  onChange={(e) => updateThreshold('warningMax', Number(e.target.value))} 
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-rose-500 cursor-pointer" 
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-rose-400 font-bold">{settings.cpsThreshold.warningMax} CPS</span>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">High Speed limit</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">AI Translation Settings</h3>
                <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="block font-bold text-slate-200">Batch Size</span>
                      <span className="text-xs text-slate-500">Số lượng segment gửi mỗi lần gọi API.</span>
                    </div>
                    <div className="text-xl font-bold text-blue-400">{settings.translationBatchSize}</div>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="500" 
                    step="1"
                    value={settings.translationBatchSize}
                    onChange={(e) => setSettings({...settings, translationBatchSize: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    <span>MIN (10)</span>
                    <span>MAX (500)</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">AI & Automation</h3>
                
                <div className="flex flex-col gap-4">
                  <label className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl cursor-pointer group hover:bg-slate-800/50 transition-all">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={settings.autoFixOnUpload}
                        onChange={(e) => setSettings({...settings, autoFixOnUpload: e.target.checked})}
                        className="w-5 h-5 bg-slate-900 border-slate-700 rounded text-blue-500 focus:ring-blue-500 transition-all"
                      />
                      <div>
                        <span className="block font-bold text-slate-200">Auto-fix on Upload</span>
                        <span className="text-xs text-slate-500">Tự động sửa lỗi định dạng ngay khi nạp file.</span>
                      </div>
                    </div>
                  </label>

                  <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl space-y-3">
                    <div className="text-sm font-bold text-slate-200">Optimization Mode</div>
                    <div className="flex gap-2">
                      {['safe', 'aggressive'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setSettings({...settings, optimizationMode: mode as any})}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                            settings.optimizationMode === mode 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10' 
                              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      {settings.optimizationMode === 'safe' 
                          ? 'Chế độ Safe: Ưu tiên giữ nguyên ý nghĩa, chỉ tối ưu khi CPS quá cao.' 
                          : 'Chế độ Aggressive: Ưu tiên trải nghiệm người dùng, ép CPS về vùng an toàn.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;