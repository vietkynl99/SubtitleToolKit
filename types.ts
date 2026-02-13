
export type Status = 'idle' | 'loading' | 'processing' | 'success' | 'partial-success' | 'error' | 'retry';

export interface SubtitleSegment {
  id: number;
  startTime: string; // HH:MM:SS,mmm
  endTime: string;
  originalText: string;
  translatedText: string;
  isModified: boolean;
  errors: SubtitleError[];
}

export interface SubtitleError {
  type: 'local' | 'heavy';
  message: string;
}

export interface AnalysisResult {
  totalLines: number;
  tooLongLines: number;
  tooFastLines: number;
  avgCPS: number;
  cpsGroups: {
    safe: number; // < 20
    warning: number; // 20-25
    danger: number; // > 25
  };
}

export interface ProjectHistory {
  id: string;
  name: string;
  timestamp: number;
  segments: SubtitleSegment[];
}

export interface AppSettings {
  defaultCPS: number;
  autoFixOnUpload: boolean;
  aiMode: 'fast' | 'pro';
}
