import React from 'react';
import { 
  Upload, 
  BarChart3, 
  Languages, 
  Wand2, 
  Settings, 
  History, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight,
  Save,
  Trash2,
  RefreshCw,
  FileText
} from 'lucide-react';

export const ICONS = {
  Upload: <Upload size={18} />,
  Analyzer: <BarChart3 size={18} />,
  Translate: <Languages size={18} />,
  Fix: <Wand2 size={18} />,
  Settings: <Settings size={18} />,
  History: <History size={18} />,
  Export: <Download size={18} />,
  Success: <CheckCircle2 size={18} className="text-green-500" />,
  Warning: <AlertCircle size={18} className="text-yellow-500" />,
  Error: <AlertCircle size={18} className="text-red-500" />,
  Time: <Clock size={18} />,
  Next: <ChevronRight size={18} />,
  Save: <Save size={18} />,
  Delete: <Trash2 size={18} />,
  Retry: <RefreshCw size={18} />,
  File: <FileText size={18} />
};

export const DEFAULT_SETTINGS = {
  safeThreshold: 25,
  criticalThreshold: 40,
  autoFixOnUpload: false,
  aiMode: 'fast' as const
};