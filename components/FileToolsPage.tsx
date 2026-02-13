import React, { useState } from 'react';
import SplitModal from './SplitModal';
import { SubtitleSegment } from '../types';
import { SplitResult } from '../services/subtitleLogic';
import { ICONS } from '../constants';

interface FileToolsPageProps {
  fileName: string;
  totalSegments: number;
  segments: SubtitleSegment[];
  onSplitConfirm: (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => Promise<void>;
  generatedFiles: SplitResult[];
  onDownloadGenerated: (file: SplitResult) => void;
  onLoadGenerated: (file: SplitResult) => void;
  onDeleteGenerated: (index: number) => void;
}

const FileToolsPage: React.FC<FileToolsPageProps> = (props) => {
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  if (!props.fileName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
            {ICONS.Split}
          </div>
          <h2 className="text-2xl font-bold text-slate-200">No Project Loaded</h2>
          <p className="text-slate-500">Vui lòng upload file SRT trước khi sử dụng File Tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Page Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">{ICONS.Split}</span>
            File Tools
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and optimize your subtitle files.</p>
        </div>
        
        <button 
          onClick={() => setShowSplitConfig(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20"
        >
          {ICONS.Split} Configure Split
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] opacity-60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Split SRT Engine
              </h3>
            </div>

            {props.generatedFiles.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-12 text-center space-y-6 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                  {ICONS.Split}
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-slate-300">Chưa có file được chia</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Sử dụng công cụ Split để chia file thành các phần nhỏ hơn theo thời lượng hoặc số dòng.
                  </p>
                </div>
                <button 
                  onClick={() => setShowSplitConfig(true)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-2xl transition-all"
                >
                  Bắt đầu chia file
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {props.generatedFiles.map((file, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 hover:border-blue-500/30 transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl">
                          {ICONS.File}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={() => props.onDeleteGenerated(idx)}
                            className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                          >
                            {ICONS.Delete}
                          </button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 line-clamp-2 leading-tight">{file.fileName}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>{file.segments.length} segments</span>
                          {file.metadata?.duration && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                              <span>{file.metadata.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-8">
                      <button 
                        onClick={() => props.onLoadGenerated(file)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                      >
                        Nạp Editor
                      </button>
                      <button 
                        onClick={() => props.onDownloadGenerated(file)}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                      >
                        {ICONS.Export} Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showSplitConfig && (
        <SplitModal 
          onClose={() => setShowSplitConfig(false)} 
          onConfirm={props.onSplitConfirm} 
          totalSegments={props.totalSegments} 
          segments={props.segments}
        />
      )}
    </div>
  );
};

export default FileToolsPage;