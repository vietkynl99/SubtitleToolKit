
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Status, 
  SubtitleSegment, 
  AnalysisResult, 
  AppSettings, 
  ProjectHistory 
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

  // Derived state
  const analysis = useMemo(() => analyzeSegments(segments, 'translatedText'), [segments]);
  const selectedSegment = useMemo(() => segments.find(s => s.id === selectedId), [segments, selectedId]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('subtitle_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

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

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('processing');
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSRT(content);
      
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
    reader.readAsText(file);
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
  };

  const updateSegmentText = (id: number, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translatedText: text, isModified: true } : s));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress}>
      {activeTab === 'upload' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/50">
          <div className="w-full max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="p-6 bg-blue-600/10 rounded-full border-2 border-dashed border-blue-500/30 animate-pulse">
                {ICONS.Upload}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-100 mb-4 tracking-tight">Subtitle Toolkit</h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
              Upload your Chinese SRT files to begin the translation and optimization process.
            </p>
            
            <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer transition-all shadow-xl shadow-blue-500/20 active:scale-95">
              {ICONS.Upload}
              <span>Choose SRT File</span>
              <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} />
            </label>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                { title: 'AI Translation', desc: 'Context-aware Chinese to Vietnamese translation.' },
                { title: 'Smart Analytics', desc: 'Real-time CPS and line-length monitoring.' },
                { title: 'Auto Optimization', desc: 'Fix formatting and timing issues instantly.' }
              ].map((feature, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="text-blue-400 font-bold mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Column 1: List */}
          <div className="w-80 flex flex-col overflow-hidden">
            <SegmentList 
              segments={segments} 
              selectedId={selectedId} 
              onSelect={setSelectedId} 
            />
          </div>

          {/* Column 2: Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <div className="p-6 flex-1 flex flex-col">
              {selectedSegment ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-3">
                      <span className="text-slate-500 font-mono">Segment #{selectedSegment.id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400 font-mono">{selectedSegment.startTime} - {selectedSegment.endTime}</span>
                    </h2>
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
                      <label className="text-xs font-bold text-blue-500 uppercase tracking-widest">Translation (VN)</label>
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
                  <p className="text-sm font-medium">Select a segment to start editing</p>
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
                    {status === 'processing' ? ICONS.Retry : ICONS.Translate}
                    AI Translate
                  </button>
                  <button 
                    onClick={handleAiFix}
                    disabled={status === 'processing'}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-lg transition-all"
                  >
                    {ICONS.Fix}
                    AI Refine
                  </button>
                  <button 
                    onClick={handleLocalFixAll}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 text-sm font-bold rounded-lg transition-all"
                  >
                    Auto Format
                  </button>
                </div>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {ICONS.Export}
                  Export SRT
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Analytics */}
          <div className="w-80 flex flex-col border-l border-slate-800">
             <AnalyzerPanel data={analysis} />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 p-12 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-8">Recent Projects</h2>
          {history.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center">
              <p className="text-slate-500 italic">No project history found yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-600/10 rounded-xl text-blue-500">{ICONS.File}</div>
                    <button className="text-slate-600 hover:text-rose-500 transition-colors">{ICONS.Delete}</button>
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
                      Load Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-12 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">System Settings</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800">
            <div className="p-8">
              <h3 className="font-bold mb-2">CPS (Characters Per Second)</h3>
              <p className="text-sm text-slate-500 mb-6">Set the global threshold for subtitle speed warnings.</p>
              <div className="flex items-center gap-6">
                <input 
                  type="range" min="15" max="35" 
                  value={settings.defaultCPS} 
                  onChange={(e) => setSettings({...settings, defaultCPS: Number(e.target.value)})}
                  className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer"
                />
                <span className="w-12 text-center font-bold text-blue-400">{settings.defaultCPS}</span>
              </div>
            </div>

            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="font-bold mb-1">Auto-Fix on Upload</h3>
                <p className="text-sm text-slate-500">Automatically remove double spaces and fix simple formatting.</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, autoFixOnUpload: !settings.autoFixOnUpload})}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.autoFixOnUpload ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoFixOnUpload ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="p-8">
              <h3 className="font-bold mb-2">AI Model Selection</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button 
                  onClick={() => setSettings({...settings, aiMode: 'fast'})}
                  className={`p-4 rounded-xl border transition-all text-left ${settings.aiMode === 'fast' ? 'bg-blue-600/10 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-sm mb-1">Gemini Flash (Default)</div>
                  <div className="text-[10px] opacity-70 italic">Optimized for speed & low cost</div>
                </button>
                <button 
                  onClick={() => setSettings({...settings, aiMode: 'pro'})}
                  className={`p-4 rounded-xl border transition-all text-left ${settings.aiMode === 'pro' ? 'bg-blue-600/10 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-sm mb-1">Gemini Pro</div>
                  <div className="text-[10px] opacity-70 italic">Better nuance & translation quality</div>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
             <h3 className="text-rose-400 font-bold mb-2">Danger Zone</h3>
             <button 
               onClick={() => { localStorage.removeItem('subtitle_history'); setHistory([]); }}
               className="text-xs font-bold text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-lg border border-rose-500/20 transition-all"
             >
               Clear All Project History
             </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
