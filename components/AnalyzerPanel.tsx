import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AnalysisResult, Severity } from '../types';

interface AnalyzerPanelProps {
  data: AnalysisResult;
  onFilterTrigger: (filter: 'all' | Severity) => void;
  activeFilter: 'all' | Severity;
  safeThreshold: number;
  criticalThreshold: number;
}

const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ 
  data, 
  onFilterTrigger, 
  activeFilter,
  safeThreshold,
  criticalThreshold
}) => {
  const chartData = [
    { name: 'Safe', value: data.cpsGroups.safe, color: '#10b981', id: 'safe' },
    { name: 'Warning', value: data.cpsGroups.warning, color: '#f59e0b', id: 'warning' },
    { name: 'Critical', value: data.cpsGroups.critical, color: '#f43f5e', id: 'critical' },
  ];

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto bg-slate-900">
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