import React, { useState, useEffect } from 'react';
import { TranslationPreset } from '../types';
import { ICONS } from '../constants';

interface PresetPageProps {
  preset: TranslationPreset | null;
  onReAnalyze: () => void;
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

const PresetPage: React.FC<PresetPageProps> = ({ 
  preset, 
  onReAnalyze, 
  onExport, 
  onImport, 
  onUpdatePreset,
  isLoading, 
  fileName, 
  totalSegments 
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Requirement 4 & 12.3: Auto-switch to View Mode after loading (Analyze) OR when a preset is provided (Import/Load)
  useEffect(() => {
    if (!isLoading && isEditing) {
      setIsEditing(false);
    }
  }, [isLoading]);

  // If a preset is imported while we are looking at the "Empty State", 
  // the 'preset' prop will change from null to an object.
  // This effect ensures we are in View Mode (isEditing: false) when that happens.
  useEffect(() => {
    if (preset && !isLoading) {
      setIsEditing(false);
    }
  }, [preset]);

  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item];
  };

  const handleToggleGenre = (genre: string) => {
    if (!preset) return;
    onUpdatePreset({ ...preset, genres: toggleItem(preset.genres, genre) });
  };

  const handleToggleTone = (toneItem: string) => {
    if (!preset) return;
    onUpdatePreset({ ...preset, tone: toggleItem(preset.tone, toneItem) });
  };

  const handleHumorChange = (val: number) => {
    if (!preset || isLoading) return;
    onUpdatePreset({ ...preset, humor_level: val });
  };

  const startReAnalyze = () => {
    onReAnalyze();
  };

  if (!fileName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
            {ICONS.Fix}
          </div>
          <h2 className="text-2xl font-bold text-slate-200">No Project Loaded</h2>
          <p className="text-slate-500">Vui lòng upload file SRT trước khi cấu hình Translation Preset.</p>
        </div>
      </div>
    );
  }

  // Robust check for whether a preset is considered "empty"
  const isPresetEmpty = !preset || (typeof preset === 'object' && Object.keys(preset).length === 0);

  // Requirement 12.2: Case where title is NOT analyzed yet
  if (isPresetEmpty && !isLoading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-950">
        <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="p-10 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {ICONS.Fix}
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Chưa có Translation Preset</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Phân tích tiêu đề của file <span className="text-blue-400 font-bold">{fileName}</span> để tạo phong cách dịch AI phù hợp hoặc nạp cấu hình có sẵn.
            </p>
            
            {/* Requirement 12.3 & 🎯 KẾT QUẢ MONG MUỐN: Both buttons visible */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={startReAnalyze}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
              >
                {ICONS.Retry} Analyze Title
              </button>
              <label className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-3 cursor-pointer">
                {ICONS.Upload} Import Preset
                <input type="file" accept=".json" className="hidden" onChange={onImport} />
              </label>
            </div>
          </div>
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
              <h1 className="text-[24px] font-semibold text-slate-100">Translation Preset</h1>
              <p className="text-[12px] text-slate-500 opacity-60 font-medium uppercase tracking-widest mt-0.5">Style Configuration v2.3.0</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={onExport}
              disabled={isLoading || isPresetEmpty}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {ICONS.Export} Export JSON
            </button>
            <label className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20 ${isLoading ? 'opacity-30 cursor-not-allowed' : ''}`}>
              {ICONS.Upload} Import
              {!isLoading && <input type="file" accept=".json" className="hidden" onChange={onImport} />}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Card: WORK IDENTITY */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl flex flex-col relative overflow-hidden">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Work Identity
            </h3>
            
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60 mb-2">Title Original</div>
                <div className={`text-[22px] font-bold leading-[1.35] text-slate-100 line-clamp-3`}>
                  {preset?.title_original || "---"}
                </div>
              </div>
              
              <div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60 mb-2">Title Vietnamese</div>
                <div className="text-[18px] font-semibold text-blue-400 leading-[1.4]">
                  {preset?.title_vi || "---"}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50 flex items-center justify-between">
              <div className="text-[12px] text-slate-500 opacity-50 font-medium">
                 {totalSegments} segments analyzed
              </div>
              <div className="text-[12px] text-slate-500 opacity-50 font-medium truncate max-w-[150px]">
                {fileName}
              </div>
            </div>
          </div>

          {/* Card: TRANSLATION STYLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-8 shadow-xl flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between">
              {/* Requirement 2.1: Header must be STYLE CONFIGS */}
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> STYLE CONFIGS
              </h3>
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors"
                  >
                    Done Editing
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-200 uppercase tracking-widest transition-colors"
                  >
                    Edit Style
                  </button>
                )}
                <button 
                  onClick={startReAnalyze}
                  disabled={isLoading}
                  className={`text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1 transition-colors ${isLoading ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {ICONS.Retry} Re-analyze
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-[13px] font-medium text-slate-400">AI đang phân tích tiêu đề và phong cách...</div>
              </div>
            ) : (
              <div className="space-y-8 flex-1 animate-in fade-in duration-500">
                {/* Genres */}
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Genres</div>
                  {/* Requirement 3.1 & 3.2: View Mode (Summary) vs Edit Mode (Full Selection) */}
                  <div className={`flex flex-wrap gap-2 ${isEditing ? 'max-h-40 overflow-y-auto no-scrollbar pr-1' : ''}`}>
                    {isEditing ? (
                      SUGGESTED_GENRES.map((g) => {
                        const isActive = preset?.genres.includes(g);
                        return (
                          <button
                            key={g}
                            onClick={() => handleToggleGenre(g)}
                            className={`px-[12px] py-[6px] rounded-full text-[12px] font-medium transition-all ${
                              isActive 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })
                    ) : (
                      preset?.genres.length ? preset.genres.map(g => (
                        <span key={g} className="px-[12px] py-[6px] bg-blue-600/10 border border-blue-500/20 rounded-full text-[12px] font-medium text-blue-400">
                          {g}
                        </span>
                      )) : <span className="text-[11px] text-slate-600 italic">Chưa chọn thể loại</span>
                    )}
                  </div>
                </div>

                {/* Tones */}
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Tones</div>
                  <div className={`flex flex-wrap gap-2 ${isEditing ? 'max-h-40 overflow-y-auto no-scrollbar pr-1' : ''}`}>
                    {isEditing ? (
                      SUGGESTED_TONES.map((t) => {
                        const isActive = preset?.tone.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => handleToggleTone(t)}
                            className={`px-[12px] py-[6px] rounded-full text-[12px] font-medium transition-all ${
                              isActive 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })
                    ) : (
                      preset?.tone.length ? preset.tone.map(t => (
                        <span key={t} className="px-[12px] py-[6px] bg-purple-600/10 border border-purple-500/20 rounded-full text-[12px] font-medium text-purple-400">
                          {t}
                        </span>
                      )) : <span className="text-[11px] text-slate-600 italic">Chưa chọn phong cách</span>
                    )}
                  </div>
                </div>

                {/* Humor Level */}
                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.08em] opacity-60">Humor Intensity</div>
                    <div className="text-[16px] font-semibold text-slate-200">{preset?.humor_level} <span className="text-[11px] text-slate-500 font-medium">/ 10</span></div>
                  </div>
                  
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="0" max="10" 
                      value={preset?.humor_level || 0}
                      onChange={(e) => handleHumorChange(Number(e.target.value))}
                      disabled={isLoading}
                      className="w-full h-[4px] bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer focus:ring-4 focus:ring-blue-500/10 custom-range-slider"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 opacity-50 uppercase tracking-widest">
                      <span>Nghiêm túc (0-2)</span>
                      <span>Meme (9-10)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        {!isLoading && preset && (
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 text-center animate-in slide-in-from-bottom duration-500">
            <p className="text-[12px] text-slate-500 font-medium italic opacity-80">
              Preset DNA v2.3.0 cung cấp hệ quy chiếu linh hoạt để AI dịch sát ngữ cảnh hơn.
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