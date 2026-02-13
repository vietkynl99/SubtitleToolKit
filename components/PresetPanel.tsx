
import React from 'react';
import { TranslationPreset } from '../types';
import { ICONS } from '../constants';

interface PresetPanelProps {
  preset: TranslationPreset | null;
  onReAnalyze: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const PresetPanel: React.FC<PresetPanelProps> = ({ preset, onReAnalyze, onExport, onImport, isLoading }) => {
  if (!preset && !isLoading) return null;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 overflow-hidden shadow-lg animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {/* Fix: Property 'Wand2' does not exist on type 'ICONS'. Using 'Fix' which is the property that holds the Wand2 icon. */}
          {ICONS.Fix} Translation Preset
        </h3>
        {isLoading && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          <div className="h-3 bg-slate-800 rounded w-2/3"></div>
        </div>
      ) : preset ? (
        <div className="space-y-3">
          <div>
            <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Title (Original / VI)</div>
            <div className="text-xs font-bold text-slate-200">{preset.title_original}</div>
            <div className="text-xs font-medium text-blue-400">{preset.title_vi}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-slate-600 font-bold uppercase mb-0.5">Genre</div>
              {/* Fix: Using genres[0] as main genre from TranslationPreset interface */}
              <div className="text-[11px] text-slate-300 font-bold">{preset.genres[0] || '---'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 font-bold uppercase mb-0.5">Tone</div>
              {/* Fix: tone is an array in TranslationPreset interface */}
              <div className="text-[11px] text-slate-300 font-bold">{preset.tone.join(', ') || '---'}</div>
            </div>
          </div>

          <div>
            <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Sub-genres</div>
            <div className="flex flex-wrap gap-1">
              {/* Fix: Using slice(1) of genres as sub-genres from TranslationPreset interface */}
              {preset.genres.slice(1).map((g, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-slate-700/50 border border-slate-600/30 rounded text-[9px] text-slate-400">
                  {g}
                </span>
              ))}
              {preset.genres.length <= 1 && <span className="text-[9px] text-slate-600 italic">None</span>}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-slate-600 font-bold uppercase">Humor Level</span>
              <span className="text-[10px] font-bold text-blue-400">{preset.humor_level}/10</span>
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${preset.humor_level * 10}%` }}></div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/50 flex gap-2">
            <button 
              onClick={onReAnalyze}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
            >
              {ICONS.Retry} Re-analyze
            </button>
            <button 
              onClick={onExport}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
            >
              {ICONS.Export} Export
            </button>
            <label className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300 transition-colors cursor-pointer">
              {ICONS.Upload} Import
              <input type="file" accept=".json" className="hidden" onChange={onImport} />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PresetPanel;
