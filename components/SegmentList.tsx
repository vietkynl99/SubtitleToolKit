
import React from 'react';
import { SubtitleSegment } from '../types';
import { calculateCPS } from '../services/subtitleLogic';

interface SegmentListProps {
  segments: SubtitleSegment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const SegmentList: React.FC<SegmentListProps> = ({ segments, selectedId, onSelect }) => {
  return (
    <div className="flex-1 overflow-y-auto border-r border-slate-800 bg-slate-900/30">
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-800 z-10">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Segments ({segments.length})</h3>
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {segments.map((seg) => {
          const text = seg.translatedText || seg.originalText;
          const cps = calculateCPS(seg, text);
          let cpsColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
          if (cps > 25) cpsColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
          else if (cps > 20) cpsColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';

          return (
            <div
              key={seg.id}
              onClick={() => onSelect(seg.id)}
              className={`p-4 cursor-pointer transition-all hover:bg-slate-800 group ${
                selectedId === seg.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-slate-500">#{seg.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cpsColor}`}>
                  {cps.toFixed(1)} CPS
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
      </div>
    </div>
  );
};

export default SegmentList;
