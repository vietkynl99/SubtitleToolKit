export type Status = 'idle' | 'loading' | 'processing' | 'success' | 'partial-success' | 'error' | 'retry' | 'clearing';

export type Severity = 'safe' | 'warning' | 'critical';

export interface TranslationPreset {
  title_original: string;
  title_vi: string;
  genres: string[];
  tone: string[];
  humor_level: number;
}

export interface SubtitleSegment {
  id: number;
  startTime: string; // HH:MM:SS,mmm
  endTime: string;
  originalText: string | null; // Nullable for VN-only segments
  translatedText: string | null; // Nullable for CN-only segments
  isModified: boolean;
  isProcessing?: boolean;
  errors: SubtitleError[];
  severity: Severity;
  cps: number;
  issueList: string[];
}

export interface SubtitleError {
  type: 'local' | 'heavy';
  message: string;
}

export interface HistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface AnalysisResult {
  totalLines: number;
  tooLongLines: number;
  tooFastLines: number;
  avgCPS: number;
  minCPS: number;
  maxCPS: number;
  medianCPS: number;
  cpsGroups: {
    safe: number; 
    warning: number;
    critical: number;
  };
  cpsHistogram: HistogramBucket[];
}

export interface ProjectHistory {
  id: string;
  name: string;
  timestamp: number;
  segments: SubtitleSegment[];
}

export interface AppSettings {
  safeThreshold: number;
  criticalThreshold: number;
  autoFixOnUpload: boolean;
  aiMode: 'fast' | 'pro';
}

export interface SplitMetadata {
  range: string;
  start: string;
  end: string;
  segments: number;
  duration: string;
}