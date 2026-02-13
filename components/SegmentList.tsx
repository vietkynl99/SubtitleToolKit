import React from 'react';
import { SubtitleSegment, Severity } from '../types';

interface SegmentListProps {
  segments: SubtitleSegment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  filter: 'all' | Severity;
  onFilterChange: (filter: 'all' | Severity) => void;
  safeThreshold: number;
  criticalThreshold: number;
}

const SegmentList: React.FC<SegmentListProps> = ({ 
  segments, 
  selectedId, 
  onSelect, 
  filter, 
  onFilterChange,
  safeThreshold,
  criticalThreshold
}) => {
  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'critical': return <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="Critical"></span>;
      case 'warning': return <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" title="Warning"></span>;
      default: return <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" title="Safe"></span>;
    }
  };

  const getCpsColor = (cps: number) => {
    if (cps > criticalThreshold) return 'text-rose-400';
    if (cps >= safeThreshold) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const filters: { id: 'all' | Severity, label: string, color: string }[] = [
    { id: 'all', label: 'All', color: 'bg-slate-700' },
    { id: 'safe', label: 'Safe', color: 'bg-emerald-600' },
    { id: 'warning', label: 'Warning', color: 'bg-amber-600' },
    { id: 'critical', label: 'Critical', color: 'bg-rose-600' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800 bg-slate-900/30">
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-800 z-10 shrink-0">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Segments ({segments.length})</h3>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight ${
                filter === f.id 
                  ? `${f.color} text-white shadow-lg` 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {segments.map((seg) => {
          return (
            <div
              key={seg.id}
              onClick={() => onSelect(seg.id)}
              className={`p-4 cursor-pointer transition-all hover:bg-slate-800 group relative ${
                selectedId === seg.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(seg.severity)}
                  <span className="text-xs font-mono text-slate-500">#{seg.id}</span>
                </div>
                <span className={`text-[10px] font-bold font-mono ${getCpsColor(seg.cps)}`}>
                  {seg.cps.toFixed(1)} CPS
                </span>
              </div>
              <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                {seg.originalText}
              </p>
              {seg.translatedText && (
                <p className="text-sm text-blue-400/80 mt-2 line-clamp-2 leading-relaxed italic border-l border-slate-700 pl-3">
                  {seg.translatedText}
                </p>
              )}
              <div className="mt-2 flex gap-3 text-[10px] text-slate-500 font-mono">
                <span>{seg.startTime}</span>
                <span>→</span>
                <span>{seg.endTime}</span>
              </div>
            </div>
          );
        })}
        {segments.length === 0 && (
          <div className="p-8 text-center text-slate-600 text-xs italic">
            Không có segment nào phù hợp bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentList;