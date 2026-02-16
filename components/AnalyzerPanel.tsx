import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';
import { AnalysisResult, Severity, SubtitleSegment } from '../types';
import { ICONS } from '../constants';
import { SplitResult } from '../services/subtitleLogic';

interface AnalyzerPanelProps {
  data: AnalysisResult;
  segments: SubtitleSegment[]; // Pass segments for additional stats like modified count
  onFilterTrigger: (filter: any) => void;
  activeFilter: any;
  safeThreshold: number;
  criticalThreshold: number;
  onOpenSplit: () => void;
  onClearProject: () => void;
  generatedFiles: SplitResult[];
  onDownloadGenerated: (file: SplitResult) => void;
  onLoadGenerated?: (file: SplitResult) => void;
  onDeleteGenerated: (index: number) => void;
}

const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ 
  data, 
  segments,
  onFilterTrigger, 
  activeFilter,
  safeThreshold,
  criticalThreshold,
  onOpenSplit,
  onClearProject,
  generatedFiles,
  onDownloadGenerated,
  onLoadGenerated,
  onDeleteGenerated
}) => {
  const getBucketColor = (mid: number) => {
    // Sync with v1.7.0 classification
    if (mid > criticalThreshold) return '#f43f5e'; // rose-500
    if (mid >= safeThreshold) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  const formattedHistogramData = data.cpsHistogram.map(b => ({
    ...b,
    color: getBucketColor(b.min + 2.5)
  }));

  const isFilterRange = typeof activeFilter === 'object' && activeFilter?.type === 'range';

  // Requirement: Translation Progress (v2.2.0)
  const translatedCount = segments.filter(s => s.translatedText && s.translatedText.trim() !== '').length;
  const translationPercentage = segments.length > 0 ? Math.round((translatedCount / segments.length) * 100) : 0;

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto bg-slate-900 no-scrollbar pb-12">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quality Dashboard</h3>
          {activeFilter !== 'all' && (
             <button 
              onClick={() => onFilterTrigger('all')}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase"
            >
              Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onFilterTrigger('safe')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'safe' ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-emerald-400">{data.cpsGroups.safe}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Safe</span>
          </button>
          <button 
            onClick={() => onFilterTrigger('warning')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'warning' ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-amber-400">{data.cpsGroups.warning}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Warning</span>
          </button>
          <button 
            onClick={() => onFilterTrigger('critical')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'critical' ? 'bg-rose-500/20 border-rose-500 shadow-lg shadow-rose-500/10' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-rose-400">{data.cpsGroups.critical}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Critical</span>
          </button>
          <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 flex flex-col justify-center">
            <span className="block text-lg font-bold text-blue-400">{translationPercentage}%</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Translated ({translatedCount}/{segments.length})</span>
          </div>
        </div>
      </section>

      {/* CPS Histogram Chart */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Detailed CPS Distribution</h3>
        <div className="h-56 w-full bg-slate-800/30 rounded-2xl p-4 border border-slate-800 relative">
          {formattedHistogramData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={formattedHistogramData} margin={{ top: 5, right: 5, bottom: 20, left: -25 }}>
                <XAxis 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 9}} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 9}} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-2xl z-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Range: {d.range}</p>
                          <p className="text-sm font-bold text-blue-400">{d.count} Segments</p>
                          <p className="text-[10px] text-slate-500 font-medium">{d.percentage}% of total</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[3, 3, 0, 0]} 
                  onClick={(d: any) => onFilterTrigger({ type: 'range', min: d.min, max: d.max, label: d.range })}
                >
                  {formattedHistogramData.map((entry, index) => {
                    const isActive = isFilterRange && activeFilter.label === entry.range;
                    const isAll = activeFilter === 'all';
                    return (
                      <Cell 
                        key={`cell-h-${index}`} 
                        fill={entry.color} 
                        fillOpacity={isAll || isActive ? 0.8 : 0.2} 
                        className="cursor-pointer transition-all duration-300 hover:fill-opacity-100" 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <span className="text-xs text-slate-500 font-medium italic block mb-2">Không có dữ liệu CPS để hiển thị.</span>
              <p className="text-[10px] text-slate-600">Phân tích yêu cầu có nội dung văn bản.</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistics Box */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">CPS Statistics</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Min', value: isFinite(data.minCPS) ? data.minCPS.toFixed(1) : '0' },
            { label: 'Max', value: isFinite(data.maxCPS) ? data.maxCPS.toFixed(1) : '0' },
            { label: 'Avg', value: data.avgCPS.toFixed(1) },
            { label: 'Median', value: data.medianCPS.toFixed(1) },
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl transition-colors hover:border-slate-600">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</span>
              <span className="text-lg font-bold text-slate-200">{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Generated Files */}
      {generatedFiles.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Generated Files</h3>
          <div className="space-y-2">
            {generatedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl group animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-blue-400 shrink-0">{ICONS.File}</span>
                  <div className="overflow-hidden">
                    <span className="block text-[10px] font-bold text-slate-200 truncate">{file.fileName}</span>
                    <span className="text-[9px] text-slate-500">{file.segments.length} segments</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onLoadGenerated && (
                    <button 
                      onClick={() => onLoadGenerated(file)}
                      className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors"
                      title="Load into Editor"
                    >
                      {ICONS.Next}
                    </button>
                  )}
                  <button 
                    onClick={() => onDownloadGenerated(file)}
                    className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                    title="Download"
                  >
                    {ICONS.Export}
                  </button>
                  <button 
                    onClick={() => onDeleteGenerated(idx)}
                    className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                    title="Remove"
                  >
                    {ICONS.Delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* File Tools */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">File Tools</h3>
        <div className="space-y-2">
          <button 
            onClick={onOpenSplit}
            className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-700 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-600/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                {ICONS.Split}
              </span>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-200">Split SRT</span>
                <span className="text-[10px] text-slate-500">Chia nhỏ file thành nhiều phần</span>
              </div>
            </div>
            <span className="text-slate-600 group-hover:text-slate-400 transition-all">
              {ICONS.Next}
            </span>
          </button>
        </div>
      </section>

      {/* Global Reset */}
      <section className="pt-4 border-t border-slate-800/50">
        <button 
          onClick={onClearProject}
          className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-500 text-xs font-bold transition-all"
        >
          {ICONS.Delete} Clear Current Project
        </button>
      </section>

      {/* Alerts */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Issue Alerts</h3>
        {data.tooFastLines > 0 && (
          <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
            <div>
              <p className="text-xs font-bold text-rose-400">{data.tooFastLines} segments too fast</p>
              <p className="text-[10px] text-rose-400/60 leading-normal">CPS vượt ngưỡng {criticalThreshold}. Độc giả có thể gặp khó khăn khi theo dõi.</p>
            </div>
          </div>
        )}
        {data.tooLongLines > 0 && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
            <div>
              <p className="text-xs font-bold text-amber-400">{data.tooLongLines} segments too long</p>
              <p className="text-[10px] text-amber-400/60 leading-normal">Chứa quá 2 dòng hoặc vượt quá 45 ký tự mỗi dòng.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnalyzerPanel;