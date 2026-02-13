import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Status, 
  SubtitleSegment, 
  AnalysisResult, 
  AppSettings, 
  ProjectHistory,
  Severity
} from './types';
import { 
  parseSRT, 
  analyzeSegments, 
  performLocalFix, 
  generateSRT 
} from './services/subtitleLogic';
import { 
  translateSegments, 
  aiFixSegments 
} from './services/geminiService';
import Layout from './components/Layout';
import SegmentList from './components/SegmentList';
import AnalyzerPanel from './components/AnalyzerPanel';
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
  const [filter, setFilter] = useState<'all' | Severity>('all');

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
  
  const filteredSegments = useMemo(() => {
    if (filter === 'all') return segments;
    return segments.filter(s => s.severity === filter);
  }, [segments, filter]);

  const selectedSegment = useMemo(() => segments.find(s => s.id === selectedId), [segments, selectedId]);

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
    };
    reader.onerror = () => {
      setStatus('error');
      alert('Lỗi khi đọc file');
    };
    reader.readAsText(file);
  }, [settings.autoFixOnUpload]);

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
    if (file) processFile(file);
  };

  const handleTranslate = async () => {
    if (segments.length === 0) return;
    setStatus('processing');
    setProgress(0);
    
    try {
      const translated = await translateSegments(segments);
      setSegments(translated);
      setProgress(100);
      setStatus('success');
    } catch (err) {
      setStatus('error');
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
    } catch (err) {
      setStatus('error');
    }
  };

  const handleLocalFixAll = () => {
    const fixed = segments.map(s => ({
      ...s,
      translatedText: performLocalFix(s.translatedText || s.originalText),
      isModified: true
    }));
    setSegments(fixed);
  };

  const handleExport = () => {
    const srt = generateSRT(segments);
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized_${fileName || 'subtitles.srt'}`;
    a.click();
    URL.revokeObjectURL(url);
    saveToHistory(segments, fileName || 'Exported Project');
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

  // Settings validation
  const updateThreshold = (key: 'safeThreshold' | 'criticalThreshold', val: number) => {
    const newSettings = { ...settings, [key]: val };
    if (key === 'safeThreshold' && val >= newSettings.criticalThreshold - 5) {
      // Automatic gap enforcement or prevent update
      newSettings.criticalThreshold = val + 5;
    } else if (key === 'criticalThreshold' && val <= newSettings.safeThreshold + 5) {
      newSettings.safeThreshold = Math.max(0, val - 5);
    }
    setSettings(newSettings);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress}>
      {activeTab === 'upload' && (
        <div 
          className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/50 transition-colors duration-300"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">Subtitle Toolkit</h1>
            <p className="text-slate-400 mb-12 max-w-md mx-auto leading-relaxed">
              Dịch và tối ưu phụ đề chuyên nghiệp với sự hỗ trợ của AI
            </p>

            <label 
              className={`relative group flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl transition-all cursor-pointer overflow-hidden ${
                isDragging 
                  ? 'bg-blue-600/10 border-blue-500 scale-[1.02] shadow-2xl shadow-blue-500/10' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} />
              
              <div className={`p-6 bg-blue-600/10 rounded-full border border-blue-500/20 mb-6 transition-transform duration-300 ${isDragging ? 'scale-110 animate-bounce' : 'group-hover:scale-110'}`}>
                {ICONS.Upload}
              </div>
              
              <div className="space-y-2">
                <p className="text-xl font-bold text-slate-200">
                  {isDragging ? 'Thả file để tải lên' : 'Kéo thả file SRT vào đây'}
                </p>
                <p className="text-sm text-slate-500">
                  Hoặc click để chọn file từ máy tính
                </p>
              </div>

              {status === 'processing' && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-400 font-bold">Đang xử lý file...</p>
                  <div className="w-full max-w-xs bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-blue-500 h-full animate-pulse transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
            </label>

            <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-700"></div> Định dạng .SRT</span>
              <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-700"></div> Tối đa 5MB</span>
              <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-700"></div> Tự động nhận diện Encoding</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Column 1: List with Filter */}
          <div className="w-80 flex flex-col overflow-hidden">
            <SegmentList 
              segments={filteredSegments} 
              selectedId={selectedId} 
              onSelect={setSelectedId}
              filter={filter}
              onFilterChange={setFilter}
              safeThreshold={settings.safeThreshold}
              criticalThreshold={settings.criticalThreshold}
            />
          </div>

          {/* Column 2: Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <div className="p-6 flex-1 flex flex-col">
              {selectedSegment ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-bold flex items-center gap-3">
                        <span className="text-slate-500 font-mono">Segment #{selectedSegment.id}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400 font-mono">{selectedSegment.startTime} - {selectedSegment.endTime}</span>
                      </h2>
                    </div>
                    <div className="flex gap-2">
                       <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors" title="Save changes">
                         {ICONS.Save}
                       </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original (CN)</label>
                      <div className="w-full bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-xl text-slate-300 leading-relaxed min-h-[120px]">
                        {selectedSegment.originalText}
                      </div>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-blue-500 uppercase tracking-widest">Translation (VN)</label>
                        {selectedSegment.issueList.length > 0 && (
                          <div className="flex items-center gap-2">
                            {selectedSegment.issueList.map((issue, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                                {issue}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <textarea
                        className="w-full flex-1 bg-slate-900 border border-blue-500/20 focus:border-blue-500/50 outline-none p-6 rounded-2xl text-xl text-blue-100 leading-relaxed resize-none transition-all placeholder:text-slate-700"
                        placeholder="Translating or enter manual text..."
                        value={selectedSegment.translatedText}
                        onChange={(e) => updateSegmentText(selectedSegment.id, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <div className="mb-4 text-slate-800">{ICONS.File}</div>
                  <p className="text-sm font-medium">Chọn một segment để bắt đầu biên tập</p>
                  <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl max-w-xs text-center">
                    <p className="text-xs text-slate-500">File: <span className="text-slate-400">{fileName}</span></p>
                    <p className="text-xs text-slate-500 mt-1">Size: <span className="text-slate-400">{formatSize(fileSize)}</span></p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={handleTranslate}
                    disabled={status === 'processing'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all"
                  >
                    {status === 'processing' ? <div className="animate-spin">{ICONS.Retry}</div> : ICONS.Translate}
                    AI Dịch Toàn Bộ
                  </button>
                  <button 
                    onClick={handleAiFix}
                    disabled={status === 'processing'}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-lg transition-all"
                  >
                    {ICONS.Fix}
                    AI Tối Ưu
                  </button>
                  <button 
                    onClick={handleLocalFixAll}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 text-sm font-bold rounded-lg transition-all"
                  >
                    Sửa Nhanh
                  </button>
                </div>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {ICONS.Export}
                  Xuất File SRT
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Analytics with dynamic thresholds */}
          <div className="w-80 flex flex-col border-l border-slate-800">
             <AnalyzerPanel 
                data={analysis} 
                activeFilter={filter} 
                onFilterTrigger={setFilter} 
                safeThreshold={settings.safeThreshold}
                criticalThreshold={settings.criticalThreshold}
             />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 p-12 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-8 tracking-tight">Dự án gần đây</h2>
          {history.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center">
              <p className="text-slate-500 italic">Chưa có lịch sử dự án nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-600/10 rounded-xl text-blue-500">{ICONS.File}</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = history.filter(h => h.id !== item.id);
                        setHistory(updated);
                        localStorage.setItem('subtitle_history', JSON.stringify(updated));
                      }}
                      className="text-slate-600 hover:text-rose-500 transition-colors"
                    >
                      {ICONS.Delete}
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-100 mb-1 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{new Date(item.timestamp).toLocaleString()}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                    <span className="text-xs font-mono text-slate-400">{item.segments.length} segments</span>
                    <button 
                      onClick={() => {
                        setSegments(item.segments);
                        setFileName(item.name);
                        setActiveTab('editor');
                      }}
                      className="text-xs font-bold text-blue-400 hover:underline"
                    >
                      Tải Dự Án
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-12 max-w-4xl overflow-y-auto no-scrollbar">
          <h2 className="text-3xl font-bold mb-8 tracking-tight">Cài đặt hệ thống</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800 shadow-xl">
            {/* Safe Threshold */}
            <div className="p-8">
              <h3 className="font-bold mb-1">Ngưỡng An Toàn (Safe Threshold)</h3>
              <p className="text-sm text-slate-500 mb-6">Mọi segment có CPS thấp hơn mức này được coi là Safe (🟢).</p>
              <div className="flex items-center gap-6">
                <input 
                  type="range" min="10" max="60" 
                  value={settings.safeThreshold} 
                  onChange={(e) => updateThreshold('safeThreshold', Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                />
                <span className="w-16 text-center font-bold text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">{settings.safeThreshold}</span>
              </div>
            </div>

            {/* Critical Threshold */}
            <div className="p-8">
              <h3 className="font-bold mb-1">Ngưỡng Nguy Hiểm (Critical Threshold)</h3>
              <p className="text-sm text-slate-500 mb-6">Mọi segment có CPS cao hơn mức này được coi là Critical (🔴).</p>
              <div className="flex items-center gap-6">
                <input 
                  type="range" min="15" max="80" 
                  value={settings.criticalThreshold} 
                  onChange={(e) => updateThreshold('criticalThreshold', Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-rose-500 cursor-pointer"
                />
                <span className="w-16 text-center font-bold text-rose-400 px-3 py-1 bg-rose-500/10 rounded border border-rose-500/20">{settings.criticalThreshold}</span>
              </div>
              <div className="mt-4 p-3 bg-slate-800/40 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Vùng Cảnh Báo (Warning):</span>
                <span className="text-xs text-amber-400 font-bold">{settings.safeThreshold} ≤ CPS ≤ {settings.criticalThreshold}</span>
              </div>
            </div>

            {/* Auto Fix */}
            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="font-bold mb-1">Tự động sửa lỗi khi Upload</h3>
                <p className="text-sm text-slate-500">Tự động xóa khoảng trắng thừa và ngắt dòng cơ bản.</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, autoFixOnUpload: !settings.autoFixOnUpload})}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.autoFixOnUpload ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoFixOnUpload ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* AI Model */}
            <div className="p-8">
              <h3 className="font-bold mb-2">Lựa chọn AI Model</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button 
                  onClick={() => setSettings({...settings, aiMode: 'fast'})}
                  className={`p-4 rounded-xl border transition-all text-left ${settings.aiMode === 'fast' ? 'bg-blue-600/10 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-sm mb-1">Gemini 3 Flash (Mặc định)</div>
                  <div className="text-[10px] opacity-70 italic">Nhanh chóng, tiết kiệm token</div>
                </button>
                <button 
                  onClick={() => setSettings({...settings, aiMode: 'pro'})}
                  className={`p-4 rounded-xl border transition-all text-left ${settings.aiMode === 'pro' ? 'bg-blue-600/10 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-sm mb-1">Gemini 3 Pro</div>
                  <div className="text-[10px] opacity-70 italic">Chất lượng dịch và văn phong tốt hơn</div>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
             <h3 className="text-rose-400 font-bold mb-2">Vùng nguy hiểm</h3>
             <button 
               onClick={() => { 
                 if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
                   localStorage.removeItem('subtitle_history'); 
                   setHistory([]); 
                 }
               }}
               className="text-xs font-bold text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-lg border border-rose-500/20 transition-all"
             >
               Xóa Toàn Bộ Lịch Sử Dự Án
             </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;