
import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AnalysisResult, Severity } from '../types';
import { ICONS } from '../constants';
import { SplitResult } from '../services/subtitleLogic';

interface AnalyzerPanelProps {
  data: AnalysisResult;
  onFilterTrigger: (filter: 'all' | Severity) => void;
  activeFilter: 'all' | Severity;
  safeThreshold: number;
  criticalThreshold: number;
  onOpenSplit: () => void;
  generatedFiles: SplitResult[];
  onDownloadGenerated: (file: SplitResult) => void;
  onDeleteGenerated: (index: number) => void;
}

const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ 
  data, 
  onFilterTrigger, 
  activeFilter,
  safeThreshold,
  criticalThreshold,
  onOpenSplit,
  generatedFiles,
  onDownloadGenerated,
  onDeleteGenerated
}) => {
  const chartData = [
    { name: 'Safe', value: data.cpsGroups.safe, color: '#10b981', id: 'safe' },
    { name: 'Warning', value: data.cpsGroups.warning, color: '#f59e0b', id: 'warning' },
    { name: 'Critical', value: data.cpsGroups.critical, color: '#f43f5e', id: 'critical' },
  ];

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto bg-slate-900 no-scrollbar">
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quality Dashboard</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onFilterTrigger('safe')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'safe' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-emerald-400">{data.cpsGroups.safe}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Safe</span>
          </button>
          <button 
            onClick={() => onFilterTrigger('warning')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'warning' ? 'bg-amber-500/20 border-amber-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-amber-400">{data.cpsGroups.warning}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Warning</span>
          </button>
          <button 
            onClick={() => onFilterTrigger('critical')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'critical' ? 'bg-rose-500/20 border-rose-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-rose-400">{data.cpsGroups.critical}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Critical</span>
          </button>
          <button 
            onClick={() => onFilterTrigger('all')}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeFilter === 'all' ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span className="block text-2xl font-bold text-slate-100">{data.totalLines}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Total Lines</span>
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">CPS Distribution</h3>
        <div className="h-48 w-full bg-slate-800/30 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(data) => onFilterTrigger(data.id as Severity)}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={activeFilter === 'all' || activeFilter === entry.id ? 0.8 : 0.2} className="cursor-pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* v1.3.0 Generated Files Section */}
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

      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">File Tools</h3>
        <button 
          onClick={onOpenSplit}
          className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-700 transition-all group"
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
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Issue Alerts</h3>
        {data.tooFastLines > 0 && (
          <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
            <div>
              <p className="text-xs font-bold text-rose-400">{data.tooFastLines} segments too fast</p>
              <p className="text-[10px] text-rose-400/60">CPS exceeds {criticalThreshold}. Readers may struggle.</p>
            </div>
          </div>
        )}
        {data.tooLongLines > 0 && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
            <div>
              <p className="text-xs font-bold text-amber-400">{data.tooLongLines} segments too long</p>
              <p className="text-[10px] text-amber-400/60">Contains >2 lines or excessive characters.</p>
            </div>
          </div>
        )}
        {data.cpsGroups.critical === 0 && data.cpsGroups.warning === 0 && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs font-medium text-emerald-400">Everything looks great! No issues detected.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnalyzerPanel;
