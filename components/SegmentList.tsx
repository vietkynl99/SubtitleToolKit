import React from 'react';
import { SubtitleSegment, Severity } from '../types';
import { ICONS } from '../constants';

interface SegmentListProps {
  segments: SubtitleSegment[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onUpdateText: (id: number, text: string) => void;
  onDeleteSegment: (id: number) => void;
  currentPage: number;
}

const PAGE_SIZE = 30;

const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  selectedIds,
  onToggleSelect,
  onUpdateText,
  onDeleteSegment,
  currentPage
}) => {
  const getSeverityClasses = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return { text: 'text-rose-400', bg: 'bg-rose-500' };
      case 'warning':
        return { text: 'text-amber-400', bg: 'bg-amber-500' };
      case 'safe':
      default:
        return { text: 'text-emerald-400', bg: 'bg-emerald-500' };
    }
  };

  const pagedSegments = segments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50 h-full">
      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[28px_54px_170px_minmax(240px,1fr)_minmax(260px,1fr)_92px] gap-2 px-3 py-2 mb-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="text-center">Sel</div>
            <div>#</div>
            <div>Time</div>
            <div>CN (Original)</div>
            <div>VN (Translation)</div>
            <div>CPS</div>
          </div>

          <div className="space-y-2">
            {pagedSegments.map((seg) => {
              const colors = getSeverityClasses(seg.severity);
              const isSelected = selectedIds.has(seg.id);

              return (
                <div
                  key={seg.id}
                  className={`grid grid-cols-[28px_54px_170px_minmax(240px,1fr)_minmax(260px,1fr)_92px] gap-2 items-start px-3 py-2 bg-slate-900 border rounded-xl transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="pt-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(seg.id)}
                      className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>

                  <div className="pt-1">
                    <span className="inline-flex px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-bold font-mono text-slate-300">
                      #{seg.id}
                    </span>
                  </div>

                  <div className="pt-1 text-[11px] font-bold font-mono text-slate-500 leading-tight">
                    <div>{seg.startTime}</div>
                    <div>{seg.endTime}</div>
                  </div>

                  <div className="pt-0.5">
                    <p className="text-[13px] text-slate-300 leading-snug font-medium whitespace-pre-wrap break-words">
                      {seg.originalText || <span className="text-slate-700 italic text-sm">No original text</span>}
                    </p>
                  </div>

                  <div className="pt-0.5">
                    {seg.isProcessing && !seg.translatedText ? (
                      <div className="space-y-1.5 animate-pulse">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                          PROCESSING...
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full w-4/5" />
                        <div className="h-3 bg-slate-800 rounded-full w-3/5" />
                      </div>
                    ) : (
                      <textarea
                        className="w-full bg-transparent border-none outline-none resize-none text-[13px] font-semibold leading-snug placeholder:text-slate-700 placeholder:italic text-blue-100"
                        placeholder="No translation yet..."
                        rows={Math.max(1, (seg.translatedText || '').split('\n').length)}
                        value={seg.translatedText || ''}
                        onChange={(e) => onUpdateText(seg.id, e.target.value)}
                      />
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold font-mono ${colors.text}`}>
                        {seg.cps.toFixed(1)}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteSegment(seg.id); }}
                      className="p-1 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all"
                      title="Delete segment"
                    >
                      {ICONS.Delete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {segments.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-sm text-slate-500 italic">No segments match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentList;
