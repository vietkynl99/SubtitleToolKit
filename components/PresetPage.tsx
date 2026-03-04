import React, { useState, useEffect } from 'react';
import { TranslationPreset } from '../types';
import { ICONS } from '../constants';

interface PresetPageProps {
  preset: TranslationPreset | null;
  onAnalyze: (input: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdatePreset: (newPreset: TranslationPreset) => void;
  isLoading: boolean;
  fileName: string;
  totalSegments: number;
}

const SUGGESTED_GENRES = [
  "Tu tiên", "Tiên hiệp", "Huyền huyễn", "Hệ thống", "Xuyên không", 
  "Trọng sinh", "Dị giới", "Dị năng", "Thần thoại", "Quỷ dị", 
  "Huyền nghi", "Mạt thế", "Đô thị", "Tổng tài", "Thương chiến", 
  "Hắc đạo", "Gia đấu", "Học đường", "Showbiz", "Hành động", 
  "Chiến đấu", "Sinh tồn", "Báo thù", "Trinh thám", "Kịch tính", 
  "Hài hước", "Hài hước đen", "Parody", "Châm biếm"
];

const SUGGESTED_TONES = [
  "Trang trọng", "Hào hùng", "Huyền ảo", "Bí ẩn", "U ám", 
  "Lạnh lùng", "Kiêu ngạo", "Thực tế", "Đời thường", "Phóng khoáng", 
  "Hài hước", "Mỉa mai", "Châm biếm", "Kịch tính", "Nghiêm túc"
];

const TagChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-[13px] font-medium text-blue-400 group animate-in zoom-in duration-200">
    {label}
    <button 
      onClick={onRemove}
      className="text-blue-500/50 hover:text-rose-500 transition-colors"
    >
      ✕
    </button>
  </span>
);

const PresetPage: React.FC<PresetPageProps> = ({ 
  preset, 
  onAnalyze, 
  onExport, 
  onImport, 
  onUpdatePreset,
  isLoading, 
  fileName, 
  totalSegments 
}) => {
  const [titleInput, setTitleInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [toneInput, setToneInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (preset?.reference.title_or_summary) {
      setTitleInput(preset.reference.title_or_summary);
    }
  }, [preset]);

  const handleAddTag = (type: 'genres' | 'tone', value: string, taxonomy: string[]) => {
    if (!preset) return;
    const cleanValue = value.trim();
    if (!cleanValue) return;

    if (preset[type].length >= 5) {
      setWarning(`Maximum 5 ${type === 'genres' ? 'genres' : 'tones'}.`);
      return;
    }

    if (preset[type].includes(cleanValue)) {
      setGenreInput('');
      setToneInput('');
      return;
    }

    // Taxonomy check
    if (!taxonomy.includes(cleanValue)) {
      setWarning(`"${cleanValue}" is not in the taxonomy. Please choose from the suggestions.`);
      return;
    }

    onUpdatePreset({
      ...preset,
      [type]: [...preset[type], cleanValue]
    });
    
    if (type === 'genres') setGenreInput('');
    else setToneInput('');
    setWarning(null);
  };

  const handleRemoveTag = (type: 'genres' | 'tone', index: number) => {
    if (!preset) return;
    const newList = [...preset[type]];
    newList.splice(index, 1);
    onUpdatePreset({ ...preset, [type]: newList });
    setWarning(null);
  };

  const handleHumorChange = (val: number) => {
    if (!preset || isLoading) return;
    onUpdatePreset({ ...preset, humor_level: val });
  };

  const handleAnalyzeClick = () => {
    if (!titleInput.trim()) return;
    onAnalyze(titleInput);
  };

  if (!fileName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
            {ICONS.Fix}
          </div>
          <h2 className="text-2xl font-bold text-slate-200">No Project Loaded</h2>
          <p className="text-slate-500">Please upload an SRT file before configuring the Translation Preset.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 no-scrollbar pb-24">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Page Header Area */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl">{ICONS.Fix}</div>
            <div>
              <h1 className="text-[24px] font-semibold text-slate-100">Translation Style (DNA)</h1>
              <p className="text-[12px] text-slate-500 opacity-60 font-medium uppercase tracking-widest mt-0.5">Style Configuration v3.1.0</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={onExport}
              disabled={isLoading || !preset}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {ICONS.Export} Export
            </button>
            <label className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20 ${isLoading ? 'opacity-30 cursor-not-allowed' : ''}`}>
              {ICONS.Upload} Import
              {!isLoading && <input type="file" accept=".json" className="hidden" onChange={onImport} />}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Card: REFERENCE INPUT */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl flex flex-col relative overflow-hidden">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Title / Summary
            </h3>
            
            <div className="space-y-4 flex-1 flex flex-col">
              <textarea 
                placeholder="Enter a title or plot summary for the AI to analyze the style..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 w-full bg-slate-800 border border-slate-700 focus:border-blue-500/50 outline-none p-5 rounded-2xl text-slate-100 text-base leading-relaxed resize-none font-medium transition-colors"
              />
              <button 
                onClick={handleAnalyzeClick}
                disabled={isLoading || !titleInput.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  ICONS.Retry
                )}
                Analyze DNA
              </button>
            </div>

            <div className="pt-6 border-t border-slate-800/50 flex items-center justify-between">
              <div className="text-[12px] text-slate-500 opacity-50 font-medium">
                 {totalSegments} segments analyzed
              </div>
              <div className="text-[12px] text-slate-500 opacity-50 font-medium truncate max-w-[200px]">
                {fileName}
              </div>
            </div>
          </div>

          {/* Card: STYLE CONFIGS */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> STYLE CONFIGS
              </h3>
              {warning && (
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">
                  {warning}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="text-[13px] font-medium text-slate-400">AI is analyzing style DNA...</div>
              </div>
            ) : preset ? (
              <div className="space-y-8 flex-1 animate-in fade-in duration-500">
                {/* Genres */}
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Genres (Max 5)</div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-800/50 rounded-2xl border border-slate-800 focus-within:border-blue-500/30 transition-colors">
                    {preset.genres.map((g, idx) => (
                      <TagChip key={g} label={g} onRemove={() => handleRemoveTag('genres', idx)} />
                    ))}
                    <input 
                      type="text"
                      placeholder={preset.genres.length < 5 ? "Add genre..." : ""}
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag('genres', genreInput, SUGGESTED_GENRES)}
                      disabled={preset.genres.length >= 5}
                      className="bg-transparent border-none outline-none text-[13px] text-slate-300 placeholder:text-slate-600 flex-1 min-w-[100px]"
                    />
                  </div>
                  {/* Taxonomy Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_GENRES.filter(g => !preset.genres.includes(g) && g.toLowerCase().includes(genreInput.toLowerCase())).slice(0, 8).map(g => (
                      <button 
                        key={g} 
                        onClick={() => handleAddTag('genres', g, SUGGESTED_GENRES)}
                        className="text-[10px] px-2 py-1 bg-slate-800 text-slate-500 hover:text-slate-300 rounded-md transition-colors"
                      >
                        + {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tones */}
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Tones (Max 5)</div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-800/50 rounded-2xl border border-slate-800 focus-within:border-purple-500/30 transition-colors">
                    {preset.tone.map((t, idx) => (
                      <TagChip key={t} label={t} onRemove={() => handleRemoveTag('tone', idx)} />
                    ))}
                    <input 
                      type="text"
                      placeholder={preset.tone.length < 5 ? "Add tone..." : ""}
                      value={toneInput}
                      onChange={(e) => setToneInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag('tone', toneInput, SUGGESTED_TONES)}
                      disabled={preset.tone.length >= 5}
                      className="bg-transparent border-none outline-none text-[13px] text-slate-300 placeholder:text-slate-600 flex-1 min-w-[100px]"
                    />
                  </div>
                  {/* Taxonomy Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TONES.filter(t => !preset.tone.includes(t) && t.toLowerCase().includes(toneInput.toLowerCase())).slice(0, 8).map(t => (
                      <button 
                        key={t} 
                        onClick={() => handleAddTag('tone', t, SUGGESTED_TONES)}
                        className="text-[10px] px-2 py-1 bg-slate-800 text-slate-500 hover:text-slate-300 rounded-md transition-colors"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Humor Level */}
                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Humor Intensity</div>
                    <div className="text-[16px] font-semibold text-slate-200">{preset.humor_level} <span className="text-[11px] text-slate-500 font-medium">/ 10</span></div>
                  </div>
                  
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="0" max="10" 
                      value={preset.humor_level}
                      onChange={(e) => handleHumorChange(Number(e.target.value))}
                      disabled={isLoading}
                      className="w-full h-[4px] bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer focus:ring-4 focus:ring-blue-500/10 custom-range-slider"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 opacity-50 uppercase tracking-widest">
                      <span>Serious (0-2)</span>
                      <span>Comedic (9-10)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center p-6">
                <div className="p-4 bg-slate-800 rounded-2xl text-slate-600">
                  {ICONS.Analyzer}
                </div>
                <p className="text-sm text-slate-500 italic">Enter a title/summary and click Analyze to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        {!isLoading && preset && (
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 text-center animate-in slide-in-from-bottom duration-500">
            <p className="text-[12px] text-slate-500 font-medium italic opacity-80">
              DNA v3.1.0 provides a contextual baseline for the AI. Title/Summary will be used as a context reference for every translation batch.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .custom-range-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default PresetPage;