import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';
import { AnalysisResult, Severity, SubtitleSegment } from '../types';
import { ICONS } from '../constants';
import { SplitResult } from '../services/subtitleLogic';

interface AnalyzerPanelProps {
  data: AnalysisResult;
  segments: SubtitleSegment[];
  onFilterTrigger: (filter: any) => void;
  activeFilter: any;
  safeThreshold: number;
  criticalThreshold: number;
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
  generatedFiles,
  onDownloadGenerated,
  onLoadGenerated,
  onDeleteGenerated
}) => {
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!chartWrapRef.current) return;
    const node = chartWrapRef.current;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setChartSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height))
      });
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const getBucketColor = (mid: number) => {
    if (mid > criticalThreshold) return '#f43f5e'; // rose-500
    if (mid >= safeThreshold) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  const formattedHistogramData = data.cpsHistogram.map(b => ({
    ...b,
    color: getBucketColor(b.min + 2.5)
  }));

  const isFilterRange = typeof activeFilter === 'object' && activeFilter?.type === 'range';
  const langIssueTotal = data.originalLangIssueLines + data.translatedLangIssueLines;
  const hasIssueAlerts =
    data.timelineOverlapLines > 0 ||
    data.tooLongLines > 0 ||
    langIssueTotal > 0;

  // Requirement: Translation Progress (v2.2.0)
  const translatedCount = segments.filter(s => s.translatedText && s.translatedText.trim() !== '').length;
  const translationPercentage = segments.length > 0 ? Math.floor((translatedCount / segments.length) * 100) : 0;

  return (
    <div className="p-4 space-y-6 h-full overflow-y-auto bg-slate-900 no-scrollbar pb-8">
      <section>
        {hasIssueAlerts && (
          <div className="space-y-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Issue Alert</h3>
            {data.timelineOverlapLines > 0 && (
              <button
                type="button"
                onClick={() => onFilterTrigger(activeFilter === 'timeline' ? 'all' : 'timeline')}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-all ${
                  activeFilter === 'timeline'
                    ? 'bg-rose-500/20 border border-rose-400/50 shadow-lg shadow-rose-500/10'
                    : 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15'
                }`}
                title="Click to show only timeline-overlap segments"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-rose-400">{data.timelineOverlapLines} timeline overlap issues</p>
                  <p className="text-[10px] text-rose-400/60 leading-normal">Detected pairs where previous end time is greater than next start time.</p>
                </div>
              </button>
            )}
            {data.tooLongLines > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-amber-400">{data.tooLongLines} segments too long</p>
                  <p className="text-[10px] text-amber-400/60 leading-normal">More than 2 lines. Viewers may find it hard to read quickly.</p>
                </div>
              </div>
            )}
            {langIssueTotal > 0 && (
              <button
                type="button"
                onClick={() => onFilterTrigger(activeFilter === 'lang' ? 'all' : 'lang')}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-all ${
                  activeFilter === 'lang'
                    ? 'bg-rose-500/20 border border-rose-400/50 shadow-lg shadow-rose-500/10'
                    : 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15'
                }`}
                title="Click to show only language issues"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-rose-400">{langIssueTotal} language issues</p>
                  <p className="text-[10px] text-rose-400/60 leading-normal">Origin must be Chinese, translation must be Vietnamese.</p>
                </div>
              </button>
            )}
          </div>
        )}
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Overview</h3>
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
          <button
            type="button"
            onClick={() => onFilterTrigger(activeFilter === 'translated' ? 'untranslated' : 'translated')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-center ${
              activeFilter === 'translated'
                ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/10'
                : activeFilter === 'untranslated'
                  ? 'bg-slate-700/40 border-slate-500/70'
                  : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800'
            }`}
            title={activeFilter === 'translated' ? 'Click to switch to Untranslated filter' : 'Click to show Translated segments'}
          >
            <span className="block text-lg font-bold text-blue-400">{translationPercentage}%</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Translated ({translatedCount}/{segments.length})</span>
          </button>
        </div>
      </section>

      {/* CPS Histogram Chart */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">CPS Distribution</h3>
        <div ref={chartWrapRef} className="h-56 w-full bg-slate-800/30 rounded-2xl p-4 border border-slate-800 relative">
          {formattedHistogramData.length > 0 ? (
            chartSize.width > 0 && chartSize.height > 0 ? (
            <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0}>
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
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500">
                Initializing chart...
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <span className="text-xs text-slate-500 font-medium italic block mb-2">No CPS data available to display.</span>
              <p className="text-[10px] text-slate-600">Run an analysis on a project with text content to see CPS distribution.</p>
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

    </div>
  );
};

export default AnalyzerPanel;
