import React, { useState, useMemo } from 'react';
import { ICONS } from '../constants';
import { SubtitleSegment } from '../types';
import { timeToSeconds } from '../services/subtitleLogic';

interface SplitModalProps {
  onClose: () => void;
  onConfirm: (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => Promise<void>;
  totalSegments: number;
  segments: SubtitleSegment[];
}

const SplitModal: React.FC<SplitModalProps> = ({ onClose, onConfirm, totalSegments, segments }) => {
  const [mode, setMode] = useState<'duration' | 'count' | 'manual' | 'range'>('duration');
  const [duration, setDuration] = useState<number>(10);
  const [count, setCount] = useState<number>(200);
  const [manual, setManual] = useState<string>('');
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  
  // v1.3.0 processing state
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Range states
  const [rangeType, setRangeType] = useState<'startToN' | 'aToB' | 'nToEnd'>('startToN');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(100, totalSegments));

  const formatTimestamp = (timeStr: string) => {
    return timeStr.split(',')[0]; // HH:MM:SS
  };

  const formatDurationDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const rangeValidation = useMemo(() => {
    if (mode !== 'range') return { valid: true, error: '' };
    
    let s = rangeStart;
    let e = rangeEnd;
    
    if (rangeType === 'startToN') s = 1;
    if (rangeType === 'nToEnd') e = totalSegments;

    if (isNaN(s) || isNaN(e)) return { valid: false, error: 'Vui lòng nhập số' };
    if (s < 1) return { valid: false, error: 'Index bắt đầu phải >= 1' };
    if (e > totalSegments) return { valid: false, error: `Index kết thúc tối đa là ${totalSegments}` };
    if (s >= e) return { valid: false, error: 'Index bắt đầu phải nhỏ hơn kết thúc' };
    
    return { valid: true, error: '' };
  }, [mode, rangeType, rangeStart, rangeEnd, totalSegments]);

  const previewData = useMemo(() => {
    if (mode !== 'range') {
      let text = '';
      if (mode === 'duration') text = `Dự kiến chia mỗi ${duration} phút`;
      if (mode === 'count') text = `Dự kiến tạo ~${Math.ceil(totalSegments / count)} file`;
      if (mode === 'manual') text = `Dự kiến tạo ${manual.split('\n').filter(l => l.trim()).length + 1} file`;
      return { text, valid: true };
    }

    if (!rangeValidation.valid) return { text: rangeValidation.error, valid: false };
    
    let s = rangeStart;
    let e = rangeEnd;
    if (rangeType === 'startToN') s = 1;
    if (rangeType === 'nToEnd') e = totalSegments;
    
    const startSeg = segments[s - 1];
    const endSeg = segments[e - 1];
    
    if (!startSeg || !endSeg) return { text: 'Không tìm thấy segment', valid: false };

    const diff = timeToSeconds(endSeg.endTime) - timeToSeconds(startSeg.startTime);
    
    return {
      valid: true,
      start: formatTimestamp(startSeg.startTime),
      end: formatTimestamp(endSeg.endTime),
      count: e - s + 1,
      duration: formatDurationDisplay(diff),
      isFull: s === 1 && e === totalSegments
    };
  }, [mode, duration, count, manual, totalSegments, rangeType, rangeStart, rangeEnd, rangeValidation, segments]);

  const handleConfirm = async () => {
    setStatus('processing');
    try {
      if (mode === 'range') {
        if (!rangeValidation.valid) throw new Error('Invalid range');
        let s = rangeStart;
        let e = rangeEnd;
        if (rangeType === 'startToN') s = 1;
        if (rangeType === 'nToEnd') e = totalSegments;
        await onConfirm('range', { start: s, end: e }, includeMetadata);
      } else {
        await onConfirm(mode, mode === 'duration' ? duration : mode === 'count' ? count : manual, includeMetadata);
      }
      setStatus('success');
      // Success delay for feedback
      setTimeout(onClose, 800);
    } catch (err) {
      setStatus('error');
    }
  };

  const isLocked = status === 'processing' || status === 'success';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="p-2 bg-blue-600/10 text-blue-400 rounded-xl">{ICONS.Split}</span>
              Cấu hình chia phụ đề
            </h2>
            {status === 'success' && (
              <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
                {ICONS.Success} Split thành công
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-2">Chia nhỏ file SRT thành các phần dựa trên tiêu chí cụ thể.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className={`grid grid-cols-4 gap-2 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {[
              { id: 'duration', label: 'Thời lượng', desc: 'Theo Phút' },
              { id: 'count', label: 'Số dòng', desc: 'Theo Segment' },
              { id: 'manual', label: 'Thủ công', desc: 'Timestamp' },
              { id: 'range', label: 'Range', desc: 'Theo Index' },
            ].map((opt) => (
              <button
                key={opt.id}
                disabled={isLocked}
                onClick={() => setMode(opt.id as any)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  mode === opt.id 
                    ? 'bg-blue-600/10 border-blue-500 text-blue-100 shadow-lg shadow-blue-500/10' 
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1">{opt.label}</div>
                <div className="text-[9px] opacity-60 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div className={`space-y-4 pt-2 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {mode === 'duration' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Thời lượng mỗi file (Phút)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="1" max="60" value={duration}
                    disabled={isLocked}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer"
                  />
                  <span className="w-12 text-center font-bold text-blue-400 bg-blue-500/10 rounded-lg py-1 border border-blue-500/20">{duration}</span>
                </div>
              </div>
            )}

            {mode === 'count' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Số segment mỗi file</label>
                <input 
                  type="number" min="10" max="5000" value={count}
                  disabled={isLocked}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none p-3 rounded-xl text-slate-100"
                />
              </div>
            )}

            {mode === 'manual' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nhập mốc thời gian (Mỗi dòng 1 mốc)</label>
                <textarea 
                  placeholder="00:10:00,000&#10;00:20:00,000"
                  value={manual}
                  disabled={isLocked}
                  onChange={(e) => setManual(e.target.value)}
                  className="w-full h-32 bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none p-4 rounded-xl text-slate-100 font-mono text-sm placeholder:text-slate-600 resize-none"
                />
              </div>
            )}

            {mode === 'range' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kiểu chia phạm vi</label>
                  <select 
                    value={rangeType}
                    disabled={isLocked}
                    onChange={(e) => setRangeType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none p-3 rounded-xl text-slate-100 text-sm"
                  >
                    <option value="startToN">Start → To Selected (1 → N)</option>
                    <option value="aToB">A → B (Custom Range)</option>
                    <option value="nToEnd">Position → To End (N → End)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Index Bắt Đầu (A)</label>
                    <input 
                      type="number"
                      readOnly={rangeType === 'startToN' || isLocked}
                      value={rangeType === 'startToN' ? 1 : rangeStart}
                      onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
                      className={`w-full bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none p-3 rounded-xl text-slate-100 ${rangeType === 'startToN' || isLocked ? 'opacity-50' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Index Kết Thúc (B)</label>
                    <input 
                      type="number"
                      readOnly={rangeType === 'nToEnd' || isLocked}
                      value={rangeType === 'nToEnd' ? totalSegments : rangeEnd}
                      onChange={(e) => setRangeEnd(parseInt(e.target.value) || totalSegments)}
                      className={`w-full bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none p-3 rounded-xl text-slate-100 ${rangeType === 'nToEnd' || isLocked ? 'opacity-50' : ''}`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={`p-5 rounded-2xl border transition-all ${
              !previewData.valid 
                ? 'bg-rose-500/10 border-rose-500/30' 
                : 'bg-blue-500/5 border-blue-500/20'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preview Information</span>
                {previewData.valid && mode === 'range' && previewData.isFull && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Range bao phủ toàn file</span>
                )}
              </div>
              
              {!previewData.valid ? (
                <div className="py-2 flex items-center gap-2 text-rose-400">
                  <span className="text-rose-500">{ICONS.Error}</span>
                  <span className="text-xs font-bold uppercase tracking-tight">{previewData.text}</span>
                </div>
              ) : mode === 'range' ? (
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="flex justify-between border-r border-slate-800 pr-4">
                    <span className="text-slate-500">Bắt đầu:</span>
                    <span className="text-blue-400 font-mono font-bold">{previewData.start}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-slate-500">Kết thúc:</span>
                    <span className="text-blue-400 font-mono font-bold">{previewData.end}</span>
                  </div>
                  <div className="flex justify-between border-r border-slate-800 pr-4">
                    <span className="text-slate-500">Số segment:</span>
                    <span className="text-blue-100 font-bold">{previewData.count}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-slate-500">Thời lượng:</span>
                    <span className="text-blue-100 font-bold">{previewData.duration}</span>
                  </div>
                </div>
              ) : (
                <div className="py-1 text-xs text-blue-100 font-medium">
                  {previewData.text}
                </div>
              )}
            </div>

            {/* v1.4.0 Metadata Option */}
            <div className={`p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="includeMetadata"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 bg-slate-900 border-slate-700 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="includeMetadata" className="text-xs font-medium text-slate-300 cursor-pointer">Include Split Metadata Header</label>
              </div>
              <span className="text-[10px] text-slate-500 italic">Recommended</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
          <button 
            disabled={isLocked}
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-30"
          >
            Hủy
          </button>
          <button 
            disabled={!previewData.valid || isLocked}
            onClick={handleConfirm}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            {status === 'processing' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {status === 'success' ? ICONS.Success : 'Xác nhận Split'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitModal;