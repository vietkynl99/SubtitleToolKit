import React from 'react';
import { SubtitleSegment, Severity } from '../types';
import { ICONS } from '../constants';

interface SegmentListProps {
  segments: SubtitleSegment[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onUpdateText: (id: number, text: string) => void;
  filter: 'all' | Severity | any;
  onFilterChange: (filter: any) => void;
  safeThreshold: number;
  criticalThreshold: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 30;

const SegmentList: React.FC<SegmentListProps> = ({ 
  segments, 
  selectedIds, 
  onToggleSelect,
  onSelectAll,
  onUpdateText,
  filter, 
  onFilterChange,
  safeThreshold,
  criticalThreshold,
  currentPage,
  onPageChange
}) => {
  // Helper to get color classes based on segment severity
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

  const filters: { id: 'all' | Severity, label: string, color: string }[] = [
    { id: 'all', label: 'All', color: 'bg-slate-700' },
    { id: 'safe', label: 'Safe', color: 'bg-emerald-600' },
    { id: 'warning', label: 'Warning', color: 'bg-amber-600' },
    { id: 'critical', label: 'Critical', color: 'bg-rose-600' },
  ];

  const isFilterRange = typeof filter === 'object' && filter?.type === 'range';
  const allSelected = segments.length > 0 && segments.every(s => selectedIds.has(s.id));

  // Pagination Logic
  const totalPages = Math.ceil(segments.length / PAGE_SIZE);
  const pagedSegments = segments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
            currentPage === i 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50 h-full">
      {/* Header / Filter Toolbar */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 z-10 shrink-0 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Segment Editor ({segments.length})
            </h3>
            <button 
              onClick={onSelectAll}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg transition-all border ${
                allSelected 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                Đã chọn {selectedIds.size} dòng
              </span>
            )}
            {isFilterRange && (
              <button 
                onClick={() => onFilterChange('all')}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase"
              >
                Clear Range Filter
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-tight whitespace-nowrap ${
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
      
      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {pagedSegments.map((seg) => {
          const colors = getSeverityClasses(seg.severity);
          const isSelected = selectedIds.has(seg.id);
          
          return (
            <div
              key={seg.id}
              className={`w-full bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-lg ${
                isSelected 
                  ? 'border-blue-500 ring-1 ring-blue-500/20' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Bar: Info & Timestamp */}
              <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(seg.id)}
                    className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-[10px] font-bold font-mono text-slate-400">
                    #{seg.id}
                  </span>
                  <span className="text-[11px] font-bold font-mono text-slate-500">
                    {seg.startTime} → {seg.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`text-[10px] font-bold font-mono ${colors.text}`}>
                     {seg.cps.toFixed(1)} CPS
                   </span>
                   <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                </div>
              </div>

              {/* Content Body: 2 Columns */}
              <div className="flex flex-col md:flex-row min-h-[100px]">
                {/* Left Column: Original CN */}
                <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-slate-800/50 bg-slate-900/30">
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Original (CN)</div>
                  <p className="text-base text-slate-400 leading-relaxed font-medium">
                    {seg.originalText || <span className="text-slate-700 italic text-sm">Không có text gốc</span>}
                  </p>
                </div>

                {/* Right Column: Translation VN / Processing */}
                <div className="flex-1 p-5 bg-slate-900/10">
                  <div className="text-[10px] font-bold text-blue-500/70 uppercase tracking-widest mb-2">Translation (VN)</div>
                  
                  {seg.isProcessing && !seg.translatedText ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                        ĐANG XỬ LÝ...
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full w-3/4" />
                      <div className="h-4 bg-slate-800 rounded-full w-1/2" />
                    </div>
                  ) : (
                    <textarea
                      className={`w-full bg-transparent border-none outline-none resize-none text-base font-semibold leading-relaxed placeholder:text-slate-700 placeholder:italic text-blue-100`}
                      placeholder="Chưa có bản dịch..."
                      rows={Math.max(2, (seg.translatedText || '').split('\n').length)}
                      value={seg.translatedText || ''}
                      onChange={(e) => onUpdateText(seg.id, e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {segments.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-sm text-slate-500 italic">Không có segment nào phù hợp bộ lọc.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Page {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="rotate-180 block">{ICONS.Next}</span>
            </button>
            <div className="flex items-center gap-1 mx-2">
              {renderPageNumbers()}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {ICONS.Next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentList;