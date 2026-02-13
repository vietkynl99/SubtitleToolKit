export type Status = 'idle' | 'loading' | 'processing' | 'success' | 'partial-success' | 'error' | 'retry';

export type Severity = 'safe' | 'warning' | 'critical';

export interface SubtitleSegment {
  id: number;
  startTime: string; // HH:MM:SS,mmm
  endTime: string;
  originalText: string;
  translatedText: string;
  isModified: boolean;
  errors: SubtitleError[];
  severity: Severity;
  cps: number;
  issueList: string[];
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
    safe: number; 
    warning: number;
    critical: number;
  };
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