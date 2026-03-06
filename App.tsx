import { 
  parseSRT, 
  parseSktProject,
  generateSktProject,
  analyzeSegments, 
  performLocalFix, 
  generateSRT,
  splitByCount,
  splitByDuration,
  splitByManual,
  splitByRange,
  SplitResult,
  timeToSeconds,
  secondsToTime,
  parseFileName,
  generateExportFileName
} from './services/subtitleLogic';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import { 
  Status, 
  SubtitleSegment, 
  AnalysisResult, 
  AppSettings, 
  Severity,
  SplitMetadata,
  TranslationPreset,
  ApiUsage,
  AiModel
} from './types';
import { 
  translateBatch,
  aiFixSegments,
  analyzeTranslationStyle
} from './services/geminiService';
import Layout from './components/Layout';
import SegmentList from './components/SegmentList';
import AnalyzerPanel from './components/AnalyzerPanel';
import FileToolsPage from './components/FileToolsPage';
import PresetPage from './components/PresetPage';
import { ICONS, DEFAULT_SETTINGS } from './constants';

const INITIAL_USAGE: ApiUsage = {
  style: { requests: 0, tokens: 0 },
  translate: { requests: 0, tokens: 0, segments: 0 },
  optimize: { requests: 0, tokens: 0 }
};
const EDITOR_PAGE_SIZE = 30;

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('subtitle_settings');
      const savedApiKey = localStorage.getItem('subtitle_api_key');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          apiKey: savedApiKey ?? parsed.apiKey ?? ''
        };
        return merged;
      }
      if (savedApiKey) {
        const fromKey: AppSettings = { ...DEFAULT_SETTINGS, apiKey: savedApiKey };
        return fromKey;
      }
    } catch {
      // ignore localStorage/parse errors and fall back to defaults
    }
    return DEFAULT_SETTINGS;
  });
  
  const [fileName, setFileName] = useState<string>('');
  const [baseFileName, setBaseFileName] = useState<string>('');
  const [editedCount, setEditedCount] = useState<number>(0);
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filter, setFilter] = useState<any>('all');
  const [translationFilter, setTranslationFilter] = useState<'all' | 'translated' | 'untranslated'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [segmentToDelete, setSegmentToDelete] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [generatedFiles, setGeneratedFiles] = useState<SplitResult[]>([]);
  
  const [apiUsage, setApiUsage] = useState<ApiUsage>(INITIAL_USAGE);
  const [translationPreset, setTranslationPreset] = useState<TranslationPreset | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState<boolean>(false);

  const [translationState, setTranslationState] = useState<{
    status: 'idle' | 'running' | 'stopped' | 'error' | 'completed';
    processed: number;
    total: number;
    customText?: string;
  }>({ status: 'idle', processed: 0, total: 0 });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showQualityDashboard, setShowQualityDashboard] = useState<boolean>(true);
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [showReplaceBox, setShowReplaceBox] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [isStoppingTranslate, setIsStoppingTranslate] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState<boolean>(false);
  const [searchWholeWord, setSearchWholeWord] = useState<boolean>(false);
  const [searchRegexMode, setSearchRegexMode] = useState<boolean>(false);
  const [replaceCursor, setReplaceCursor] = useState<{ segmentId: number; start: number } | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const undoStackRef = useRef<SubtitleSegment[][]>([]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 6000);
  };

  const cloneSegments = useCallback((list: SubtitleSegment[]) => list.map(seg => ({ ...seg })), []);

  const commitSegmentsChange = useCallback((updater: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => {
    setSegments(prev => {
      undoStackRef.current.push(cloneSegments(prev));
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      const next = typeof updater === 'function'
        ? (updater as (prev: SubtitleSegment[]) => SubtitleSegment[])(prev)
        : updater;
      return cloneSegments(next);
    });
  }, [cloneSegments]);

  const handleUndoSegments = useCallback(() => {
    const last = undoStackRef.current.pop();
    if (!last) return;
    setSegments(cloneSegments(last));
    setSelectedIds(new Set());
    showToast('Undo applied.');
  }, [cloneSegments]);

  useEffect(() => {
    if (baseFileName) {
      setFileName(generateExportFileName(baseFileName, editedCount));
    }
  }, [baseFileName, editedCount]);

  useEffect(() => {
    localStorage.setItem('subtitle_settings', JSON.stringify(settings));
    if (typeof settings.apiKey === 'string' && settings.apiKey.trim()) {
      localStorage.setItem('subtitle_api_key', settings.apiKey);
    } else {
      localStorage.removeItem('subtitle_api_key');
    }
  }, [settings]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, translationFilter, searchQuery, searchCaseSensitive, searchWholeWord, searchRegexMode]);

  const globalAnalysis = useMemo(() => {
    if (segments.length === 0) return null;
    return analyzeSegments(segments, 'translatedText', settings.cpsThreshold);
  }, [segments, settings.cpsThreshold]);

  const processedSegments = useMemo(() => globalAnalysis?.enrichedSegments || [], [globalAnalysis]);
  const allStats = useMemo(() => globalAnalysis?.stats, [globalAnalysis]);

  const filteredSegments = useMemo(() => {
    if (filter === 'all') return processedSegments;
    if (typeof filter === 'string') {
      return processedSegments.filter(s => s.severity === filter);
    }
    if (filter.type === 'range') {
      return processedSegments.filter(s => s.cps >= filter.min && s.cps < filter.max);
    }
    return processedSegments;
  }, [processedSegments, filter]);

  const translationFilteredSegments = useMemo(() => {
    if (translationFilter === 'translated') {
      return filteredSegments.filter(s => (s.translatedText || '').trim() !== '');
    }
    if (translationFilter === 'untranslated') {
      return filteredSegments.filter(s => (s.translatedText || '').trim() === '');
    }
    return filteredSegments;
  }, [filteredSegments, translationFilter]);

  const compileSearch = useCallback((rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return null;
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isIdSearch = q.startsWith('#');
    const queryCore = isIdSearch ? q.slice(1).trim() : q;
    if (!queryCore) return null;

    const basePattern = searchRegexMode ? queryCore : escapeRegExp(queryCore);
    const wrappedPattern = searchWholeWord
      ? `(?<![\\p{L}\\p{N}\\p{M}_])(?:${basePattern})(?![\\p{L}\\p{N}\\p{M}_])`
      : basePattern;
    const flags = `${searchCaseSensitive ? '' : 'i'}u`;
    try {
      return { regex: new RegExp(wrappedPattern, flags), isIdSearch };
    } catch {
      return null;
    }
  }, [searchCaseSensitive, searchWholeWord, searchRegexMode]);

  const editorSegments = useMemo(() => {
    const compiled = compileSearch(searchQuery);
    if (!compiled) return searchQuery.trim() ? [] : translationFilteredSegments;
    const { regex: matcher, isIdSearch } = compiled;

    if (isIdSearch) {
      return translationFilteredSegments.filter(s => matcher.test(s.id.toString()));
    }
    return translationFilteredSegments.filter(s => {
      const fields = [s.startTime, s.endTime, s.originalText || '', s.translatedText || ''];
      return fields.some(field => matcher.test(field));
    });
  }, [translationFilteredSegments, searchQuery, compileSearch]);

  const handleReplaceNext = useCallback(() => {
    const compiled = compileSearch(searchQuery);
    if (!compiled || compiled.isIdSearch) return;

    const baseRegex = compiled.regex;
    const flags = baseRegex.flags.includes('g') ? baseRegex.flags : `${baseRegex.flags}g`;
    const indexById = new Map<number, number>();
    segments.forEach((s, idx) => indexById.set(s.id, idx));

    const matches: Array<{ segmentId: number; start: number; end: number }> = [];
    segments.forEach((seg) => {
      const text = seg.translatedText || '';
      if (!text) return;
      const regex = new RegExp(baseRegex.source, flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        if (!m[0].length) {
          regex.lastIndex += 1;
          continue;
        }
        matches.push({ segmentId: seg.id, start: m.index, end: m.index + m[0].length });
      }
    });
    if (!matches.length) return;

    let target = matches[0];
    if (replaceCursor) {
      const curOrder = indexById.get(replaceCursor.segmentId) ?? -1;
      const nextMatch = matches.find((m) => {
        const mOrder = indexById.get(m.segmentId) ?? -1;
        return mOrder > curOrder || (mOrder === curOrder && m.start > replaceCursor.start);
      });
      if (nextMatch) target = nextMatch;
    }

    const segIdx = segments.findIndex(s => s.id === target.segmentId);
    if (segIdx === -1) return;
    const src = segments[segIdx].translatedText || '';
    const changed = `${src.slice(0, target.start)}${replaceQuery}${src.slice(target.end)}`;
    const updated = [...segments];
    updated[segIdx] = { ...updated[segIdx], translatedText: changed };
    commitSegmentsChange(updated);
    setReplaceCursor({ segmentId: target.segmentId, start: target.start + replaceQuery.length });
  }, [compileSearch, searchQuery, segments, replaceCursor, replaceQuery, commitSegmentsChange]);

  const handleReplaceAll = useCallback(() => {
    const compiled = compileSearch(searchQuery);
    if (!compiled || compiled.isIdSearch) return;

    const baseRegex = compiled.regex;
    const flags = baseRegex.flags.includes('g') ? baseRegex.flags : `${baseRegex.flags}g`;
    let count = 0;
    const updated = segments.map((seg) => {
      const text = seg.translatedText || '';
      if (!text) return seg;
      const regex = new RegExp(baseRegex.source, flags);
      const replaced = text.replace(regex, () => {
        count += 1;
        return replaceQuery;
      });
      return replaced === text ? seg : { ...seg, translatedText: replaced };
    });
    commitSegmentsChange(updated);
    setReplaceCursor(null);
    showToast(count > 0 ? `Replaced ${count} match(es).` : 'No matches to replace.');
  }, [compileSearch, searchQuery, segments, replaceQuery, commitSegmentsChange]);

  const totalEditorPages = useMemo(
    () => Math.max(1, Math.ceil(editorSegments.length / EDITOR_PAGE_SIZE)),
    [editorSegments.length]
  );

  useEffect(() => {
    if (currentPage > totalEditorPages) {
      setCurrentPage(totalEditorPages);
    }
  }, [currentPage, totalEditorPages]);

  useEffect(() => {
    setReplaceCursor(null);
  }, [searchQuery, replaceQuery, searchCaseSensitive, searchWholeWord, searchRegexMode]);

  useEffect(() => {
    if (!showSearchBox) return;
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!searchAreaRef.current?.contains(event.target as Node) && !searchQuery.trim() && !replaceQuery.trim()) {
        setShowSearchBox(false);
        setShowReplaceBox(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [showSearchBox, searchQuery, replaceQuery]);

  useEffect(() => {
    const handleFindShortcut = (event: KeyboardEvent) => {
      if (!(activeTab === 'editor' && segments.length > 0)) return;
      const target = event.target as HTMLElement | null;
      const isTypingTarget = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      const isFind = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f';
      const isReplace = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h';
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      if (isFind) {
        event.preventDefault();
        setShowSearchBox(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (isReplace) {
        event.preventDefault();
        setShowSearchBox(true);
        setShowReplaceBox(true);
        setTimeout(() => replaceInputRef.current?.focus(), 0);
      }
      if (isUndo && !isTypingTarget) {
        event.preventDefault();
        handleUndoSegments();
      }
    };
    window.addEventListener('keydown', handleFindShortcut);
    return () => window.removeEventListener('keydown', handleFindShortcut);
  }, [activeTab, segments.length, handleUndoSegments]);

  const totalDurationStr = useMemo(() => {
    if (processedSegments.length === 0) return '0m 0s';
    const first = processedSegments[0];
    const last = processedSegments[processedSegments.length - 1];
    const totalSec = Math.max(0, timeToSeconds(last.endTime) - timeToSeconds(first.startTime));
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}m ${s}s`;
  }, [processedSegments]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("File name copied to clipboard");
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === editorSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(editorSegments.map(s => s.id)));
    }
  };

  const handleDNAAnalyze = async (input: string) => {
    if (!settings.apiKey?.trim()) {
      showToast("Please enter your Gemini API Key in Settings.");
      setActiveTab('settings');
      return;
    }
    if (!input.trim()) return;
    setIsPresetLoading(true);
    try {
      const { preset, tokens } = await analyzeTranslationStyle(input, settings.aiModel, settings.apiKey);
      
      setTranslationPreset(preset);
      setApiUsage(prev => ({
        ...prev,
        style: {
          requests: prev.style.requests + 1,
          tokens: prev.style.tokens + tokens
        }
      }));

      showToast("DNA analysis complete. Translation style initialized.");
    } catch (err) {
      console.error("DNA analysis failed", err);
      showToast("Failed to analyze translation style.");
    } finally {
      setIsPresetLoading(false);
    }
  };

  const handleExportPreset = () => {
    if (!translationPreset) return;
    const blob = new Blob([JSON.stringify(translationPreset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[DNA] ${translationPreset.reference.title_or_summary.slice(0, 20)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const isValid = json.reference?.title_or_summary && 
                        Array.isArray(json.genres) && 
                        Array.isArray(json.tone) && 
                        typeof json.humor_level === 'number';

        if (isValid) {
          setTranslationPreset(json);
          showToast("DNA preset imported successfully.");
        } else {
          showToast("Invalid DNA file or incompatible version.");
        }
      } catch (err) {
        showToast("Error while reading DNA file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.srt') && !ext.endsWith('.sktproject')) {
      alert('Please select a .srt or .sktproject file.');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB.');
      setStatus('error');
      return;
    }

    const { baseName, editedCount: count } = parseFileName(file.name);
    setBaseFileName(baseName);
    setEditedCount(count);

    setStatus('processing');
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      try {
        let parsedSegments: SubtitleSegment[] = [];
        let preset: TranslationPreset | null = null;

        if (ext.endsWith('.srt')) {
          parsedSegments = parseSRT(content);
          setProjectCreatedAt(new Date().toISOString());
        } else {
          const res = parseSktProject(content);
          parsedSegments = res.segments;
          preset = res.preset || null;
          setProjectCreatedAt(null);
        }
        
        if (parsedSegments.length === 0) {
          alert('File has no valid segments or has an invalid format.');
          setStatus('error');
          return;
        }

        if (settings.autoFixOnUpload) {
          parsedSegments = parsedSegments.map(s => ({ ...s, originalText: performLocalFix(s.originalText || "") }));
        }

        setSegments(parsedSegments);
        undoStackRef.current = [];
        setTranslationPreset(preset);
        setTranslationState({ status: 'idle', processed: 0, total: 0 });
        setApiUsage(INITIAL_USAGE);
        setProgress(100);
        setStatus('success');
        setActiveTab('editor');
        setGeneratedFiles([]);
        setFilter('all');
        setCurrentPage(1); 
        setSelectedIds(new Set());
      } catch (err) {
        alert('Error while parsing file: ' + (err as Error).message);
        setStatus('error');
      }
    };
    reader.onerror = () => {
      setStatus('error');
      alert('Error while reading file.');
    };
    reader.readAsText(file);
  }, [settings.autoFixOnUpload]);

  const performClear = async (skipFeedback = false) => {
    setStatus('clearing');
    await new Promise(resolve => setTimeout(resolve, 800));
    setSegments([]);
    undoStackRef.current = [];
    setGeneratedFiles([]);
    setTranslationPreset(null);
    setTranslationState({ status: 'idle', processed: 0, total: 0 });
    setApiUsage(INITIAL_USAGE);
    setFileName('');
    setBaseFileName('');
    setEditedCount(0);
    setProgress(0);
    setStatus('idle');
    setFilter('all');
    setCurrentPage(1);
    setShowClearModal(false);
    setActiveTab('upload');
    setSelectedIds(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!skipFeedback) showToast("Project has been cleared.");
  };

  const handleClearProjectRequest = () => {
    setShowClearModal(true);
  };

  const handleReplaceConfirm = async () => {
    if (!pendingFile) return;
    setShowReplaceModal(false);
    await performClear(true);
    processFile(pendingFile);
    setPendingFile(null);
  };

  const handleNewUploadTrigger = (file: File) => {
    if (segments.length > 0) {
      setPendingFile(file);
      setShowReplaceModal(true);
    } else {
      processFile(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleNewUploadTrigger(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleNewUploadTrigger(file);
  };

  const handleTranslate = async () => {
    if (!settings.apiKey?.trim()) {
      showToast("Please enter your Gemini API Key in Settings.");
      setActiveTab('settings');
      return;
    }
    if (segments.length === 0) return;
    const needingTranslation = segments.filter(s => !s.translatedText || s.translatedText.trim() === '');
    if (needingTranslation.length === 0) {
      showToast("All lines are already translated. Nothing to do.");
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      return;
    }
    if (!translationPreset) {
      showToast("Please configure Translation Style first.");
      setActiveTab('translation-style');
      return;
    }
    setStatus('processing');
    stopRequestedRef.current = false;
    setIsStoppingTranslate(false);
    const totalToTranslateInSession = needingTranslation.length;
    setTranslationState({ status: 'running', processed: 0, total: totalToTranslateInSession });
    setProgress(0);
    let completedInSession = 0;
    try {
      const batchSize = settings.translationBatchSize || 100;
      for (let i = 0; i < needingTranslation.length; i += batchSize) {
        if (stopRequestedRef.current) {
          setTranslationState(prev => ({ ...prev, status: 'stopped' }));
          setIsStoppingTranslate(false);
          showToast("Translation process has been stopped.");
          setStatus('success');
          return;
        }
        const currentBatch = needingTranslation.slice(i, i + batchSize);
        const firstIdx = segments.findIndex(s => s.id === currentBatch[0].id);
        const lastIdx = segments.findIndex(s => s.id === currentBatch[currentBatch.length - 1].id);
        const contextBefore = segments.slice(Math.max(0, firstIdx - 2), firstIdx).map(s => s.originalText || "");
        const contextAfter = segments.slice(lastIdx + 1, Math.min(segments.length, lastIdx + 3)).map(s => s.originalText || "");
        setSegments(prev => prev.map(s => currentBatch.some(cb => cb.id === s.id) ? { ...s, isProcessing: true } : s));
        const { translatedTexts, tokens } = await translateBatch(currentBatch, contextBefore, contextAfter, translationPreset, settings.aiModel, settings.apiKey);
        setSegments(prev => prev.map(s => {
          const bIdx = currentBatch.findIndex(cb => cb.id === s.id);
          if (bIdx !== -1) return { ...s, translatedText: translatedTexts[bIdx], isProcessing: false };
          return s;
        }));
        completedInSession += currentBatch.length;
        setApiUsage(prev => ({ ...prev, translate: { requests: prev.translate.requests + 1, tokens: prev.translate.tokens + tokens, segments: (prev.translate.segments || 0) + currentBatch.length } }));
        setTranslationState(prev => ({ ...prev, processed: completedInSession }));
        setProgress(Math.floor((completedInSession / totalToTranslateInSession) * 100));
      }
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      setIsStoppingTranslate(false);
      setStatus('success');
      showToast("Translation completed.");
    } catch (err: any) {
      setStatus('error');
      setTranslationState(prev => ({ ...prev, status: 'error' }));
      setIsStoppingTranslate(false);
      showToast(`Error: ${err.message}`);
      setSegments(prev => prev.map(s => ({ ...s, isProcessing: false })));
    }
  };

  const handleStopTranslate = () => {
    if (isStoppingTranslate) return;
    stopRequestedRef.current = true;
    setIsStoppingTranslate(true);
    showToast("Stopping translation...");
  };

  const handleAiOptimize = async () => {
    if (!settings.apiKey?.trim()) {
      showToast("Please enter your Gemini API Key in Settings.");
      setActiveTab('settings');
      return;
    }
    if (selectedIds.size === 0) return;
    setIsOptimizing(true);
    setStatus('processing');
    setProgress(0);

    let safeCount = 0;
    let optimizedCount = 0;
    let requestCount = 0;

    const currentSegments = [...segments];
    const aiTargetSegments: SubtitleSegment[] = [];

    for (const segId of Array.from(selectedIds)) {
      const seg = currentSegments.find(s => s.id === segId);
      if (!seg) continue;

      const meta = analyzeSegments([seg], 'translatedText', settings.cpsThreshold);
      const severity = meta.enrichedSegments[0].severity;

      if (severity === 'safe') {
        safeCount++;
      } else {
        aiTargetSegments.push(seg);
      }
    }

    if (aiTargetSegments.length > 0) {
      const batchSize = 20;
      const totalBatches = Math.ceil(aiTargetSegments.length / batchSize);
      
      setTranslationState({ 
        status: 'running', 
        processed: 0, 
        total: aiTargetSegments.length,
        customText: `Batch 1/${totalBatches} (${Math.min(batchSize, aiTargetSegments.length)} segments)` 
      });

      for (let i = 0; i < aiTargetSegments.length; i += batchSize) {
        const currentBatch = aiTargetSegments.slice(i, i + batchSize);
        const batchIdx = Math.floor(i / batchSize) + 1;
        
        setTranslationState(prev => ({ 
          ...prev, 
          customText: `Batch ${batchIdx}/${totalBatches} (${currentBatch.length} segments)` 
        }));

        try {
          const { segments: fixed, tokens } = await aiFixSegments(currentBatch, settings.optimizationMode, settings.aiModel, settings.apiKey);
          requestCount++;
          
          fixed.forEach(f => {
            const idx = currentSegments.findIndex(s => s.id === f.id);
            if (idx !== -1) {
              currentSegments[idx] = { ...f }; 
              optimizedCount++;
            }
          });
          
          setApiUsage(prev => ({ 
            ...prev, 
            optimize: { requests: prev.optimize.requests + 1, tokens: prev.optimize.tokens + tokens } 
          }));
        } catch (err) {
          console.error(`Error processing batch ${batchIdx}`, err);
        }

        const progressPercent = Math.floor(((i + currentBatch.length) / aiTargetSegments.length) * 100);
        setProgress(progressPercent);
      }
    }

    commitSegmentsChange(currentSegments);
    setProgress(100);
    setStatus('success');
    setSelectedIds(new Set());
    setTranslationState(prev => ({ ...prev, status: 'completed', customText: undefined }));
    setIsOptimizing(false);
    
    showToast(`Optimization finished: Skipped ${safeCount} safe segments, AI optimized ${optimizedCount} segments. Total requests: ${requestCount}.`);
  };

  const downloadFile = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadChoice = (type: 'project' | 'srt-orig' | 'srt-tran') => {
    setShowExportModal(false);
    if (type === 'project') {
      const json = generateSktProject(segments, baseFileName, translationPreset, projectCreatedAt || undefined);
      const name = generateExportFileName(baseFileName, editedCount, '.sktproject');
      downloadFile(json, name);
      setEditedCount(prev => prev + 1);
      showToast("Project saved.");
    } else if (type === 'srt-orig') {
      const srt = generateSRT(segments, 'original');
      const name = `[Origin]${generateExportFileName(baseFileName, editedCount, '.srt')}`;
      downloadFile(srt, name);
      showToast("Original SRT exported.");
    } else if (type === 'srt-tran') {
      const srt = generateSRT(segments, 'translated');
      const name = `[Translated]${generateExportFileName(baseFileName, editedCount, '.srt')}`;
      downloadFile(srt, name);
      showToast("Translated SRT exported.");
    }
  };

  const handleSplitConfirm = async (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    let res: SplitResult[] = [];
    if (mode === 'duration') res = splitByDuration(segments, value as number, fileName, includeMetadata);
    else if (mode === 'count') res = splitByCount(segments, value as number, fileName, includeMetadata);
    else if (mode === 'manual') res = splitByManual(segments, (value as string).split('\n').filter(x => x.trim()), fileName, includeMetadata);
    else if (mode === 'range') res = splitByRange(segments, value.start, value.end, fileName, includeMetadata);
    if (res.length > 0) { setGeneratedFiles(prev => [...prev, ...res]); showToast(`File has been split into ${res.length} parts.`); }
  };

  const handleDownloadGenerated = (file: SplitResult) => {
    const { baseName, editedCount: count } = parseFileName(file.fileName);
    const srt = generateSRT(file.segments, 'translated', file.metadata);
    downloadFile(srt, generateExportFileName(baseName, count));
  };

  const handleLoadGenerated = (file: SplitResult) => {
    if (confirm(`Load file "${file.fileName}" into the editor?`)) {
      setFileName(file.fileName);
      const { baseName, editedCount: count } = parseFileName(file.fileName);
      setBaseFileName(baseName);
      setEditedCount(count);
      commitSegmentsChange(file.segments);
      setSelectedIds(new Set());
      setFilter('all');
      setCurrentPage(1);
      setActiveTab('editor');
    }
  };

  const handleDeleteGenerated = (index: number) => {
    setGeneratedFiles(prev => prev.filter((_, i) => i !== index));
    showToast("Temporary split file removed.");
  };

  const updateSegmentText = (id: number, text: string) => {
    commitSegmentsChange(prev => prev.map(s => s.id === id ? { ...s, translatedText: text } : s));
  };

  const deleteSegment = (id: number) => {
    setSegmentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (segmentToDelete === null) return;
    
    commitSegmentsChange(prev => {
      const filtered = prev.filter(s => s.id !== segmentToDelete);
      return filtered.map((s, index) => ({ ...s, id: index + 1 }));
    });
    setSelectedIds(new Set());
    setShowDeleteModal(false);
    setSegmentToDelete(null);
    showToast("Segment deleted and indices have been re-numbered.");
  };

  const updateThreshold = (key: 'safeMax' | 'warningMax', val: number) => {
    setSettings(prev => {
      const nt = { ...prev.cpsThreshold, [key]: val };
      if (key === 'safeMax' && val >= nt.warningMax) nt.warningMax = val + 1;
      else if (key === 'warningMax' && val <= nt.safeMax) nt.safeMax = Math.max(0, val - 1);
      return { ...prev, cpsThreshold: nt };
    });
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress} hasProject={segments.length > 0} onClearProject={handleClearProjectRequest}>
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-700 px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-sm font-bold text-blue-400 flex items-center gap-2">{ICONS.Success} {toast.message}</p>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-3">Clear current project?</h3>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowClearModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl">Cancel</button>
              <button onClick={() => performClear()} className="flex-1 py-3 bg-rose-600 rounded-xl">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-3">Upload a new file?</h3>
            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowReplaceModal(false); setPendingFile(null); }} className="flex-1 py-3 bg-slate-800 rounded-xl">Cancel</button>
              <button onClick={handleReplaceConfirm} className="flex-1 py-3 bg-blue-600 rounded-xl">Confirm & Upload</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              {ICONS.Delete}
            </div>
            <h3 className="text-xl font-bold mb-2 text-center">Delete segment?</h3>
            <p className="text-slate-400 text-sm text-center mb-8">Are you sure you want to delete this segment? This will re-index all remaining segments.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setSegmentToDelete(null); }} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold transition-colors">Confirm delete</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] shadow-2xl p-6 md:p-7 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-4">Download</h3>
            <div className="space-y-3">
              <button onClick={() => handleDownloadChoice('project')} className="w-full p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-left hover:bg-blue-600/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-bold text-blue-400">Save Project (.sktproject)</span>
                    <span className="text-[11px] text-slate-500">Save full project state, presets, and text for later editing.</span>
                  </div>
                  <span className="text-blue-500 group-hover:translate-x-1 transition-transform">{ICONS.Next}</span>
                </div>
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleDownloadChoice('srt-tran')} className="min-h-[96px] p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl text-left hover:bg-emerald-600/20 transition-all group flex flex-col justify-between">
                  <span className="block font-bold text-emerald-400">Export Translated SRT</span>
                  <span className="text-[10px] text-slate-500">Translated Vietnamese version</span>
                </button>
                <button onClick={() => handleDownloadChoice('srt-orig')} className="min-h-[96px] p-5 bg-slate-800 border border-slate-700 rounded-2xl text-left hover:bg-slate-700 transition-all group flex flex-col justify-between">
                  <span className="block font-bold text-slate-400">Export Original SRT</span>
                  <span className="text-[10px] text-slate-500">Original Chinese version</span>
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-slate-400 font-bold hover:text-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {segments.length > 0 && fileName && (
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg shrink-0">{ICONS.File}</div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-slate-100 truncate cursor-pointer" onClick={() => copyToClipboard(fileName)}>{fileName}</h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{processedSegments.length} SEGMENTS</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{allStats?.avgCPS.toFixed(1) || 0} AVG CPS</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{totalDurationStr}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/50" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-3xl font-bold text-slate-100 mb-1 tracking-tight">Subtitle Toolkit</h1>
            <p className="text-slate-400 mb-8">Professional subtitle translation and optimization.</p>
            <label className={`relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer ${isDragging ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-slate-800'}`}>
              <input type="file" accept=".srt,.sktproject" className="hidden" onChange={handleFileUpload} />
              <div className="p-5 bg-blue-600/10 rounded-full border border-blue-500/20 mb-5">{ICONS.Upload}</div>
              <p className="text-lg font-bold text-slate-200">Drag & drop SRT/SKTPROJECT file here</p>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'translation-style' && (
        <PresetPage preset={translationPreset} isLoading={isPresetLoading} onAnalyze={handleDNAAnalyze} onExport={handleExportPreset} onImport={handleImportPreset} onUpdatePreset={setTranslationPreset} fileName={fileName} totalSegments={segments.length} />
      )}

      {activeTab === 'file-tools' && (
        <FileToolsPage fileName={fileName} totalSegments={segments.length} segments={segments} onSplitConfirm={handleSplitConfirm} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
      )}

      {activeTab === 'editor' && segments.length > 0 && (
        <div className="flex-1 flex overflow-hidden relative">
          <button
            type="button"
            onClick={() => setShowQualityDashboard(prev => !prev)}
            className="absolute top-3 right-3 z-30 w-10 h-10 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-300 transition-all flex items-center justify-center"
            aria-label={showQualityDashboard ? 'Hide quality dashboard' : 'Show quality dashboard'}
            title={showQualityDashboard ? 'Hide quality dashboard' : 'Show quality dashboard'}
          >
            <span className="sr-only">{showQualityDashboard ? 'Hide quality dashboard' : 'Show quality dashboard'}</span>
            <span className="flex flex-col gap-1">
              <span className="block w-4 h-[2px] bg-current rounded-full"></span>
              <span className="block w-4 h-[2px] bg-current rounded-full"></span>
              <span className="block w-4 h-[2px] bg-current rounded-full"></span>
            </span>
          </button>
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                  <button
                    onClick={handleSelectAll}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id))
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id)) ? 'Deselect All' : 'Select All'}
                  </button>

                  <select
                    value={typeof filter === 'string' ? filter : 'all'}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="all">All</option>
                    <option value="safe">Safe</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>

                  <select
                    value={translationFilter}
                    onChange={(e) => setTranslationFilter(e.target.value as 'all' | 'translated' | 'untranslated')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                    title="Translation status filter"
                    aria-label="Translation status filter"
                  >
                    <option value="all">All</option>
                    <option value="translated">Translated</option>
                    <option value="untranslated">Untranslated</option>
                  </select>

                  {translationState.status === 'running' ? (
                    <>
                      <button
                        onClick={handleTranslate}
                        disabled
                        className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/70 border border-blue-500/40 text-blue-100 rounded-lg text-[11px] font-bold disabled:opacity-80"
                      >
                        <span
                          className="absolute left-0 top-0 h-full bg-blue-500/30 pointer-events-none"
                          style={{ width: `${progress}%` }}
                        />
                        <span className="relative z-10 shrink-0">{ICONS.AI}</span>
                        <span className="relative z-10">
                          Translating {translationState.processed}/{translationState.total} ({progress}%)
                        </span>
                      </button>
                      <button
                        onClick={handleStopTranslate}
                        disabled={isStoppingTranslate}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isStoppingTranslate ? 'Stopping...' : 'Stop'}
                      </button>
                    </>
                  ) : (
                    <button onClick={handleTranslate} disabled={status === 'processing'} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/70 border border-blue-500/40 text-blue-100 rounded-lg text-[11px] font-bold disabled:opacity-60 transition-colors hover:bg-blue-600/70">
                      <span className="shrink-0">{ICONS.AI}</span>
                      <span>Translate All</span>
                    </button>
                  )}

                  <button
                    onClick={handleAiOptimize}
                    disabled={status === 'processing' || selectedIds.size === 0 || isOptimizing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/70 border border-blue-500/40 text-blue-100 rounded-lg text-[11px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-blue-600/70"
                  >
                    <span className="shrink-0">{ICONS.AI}</span>
                    <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
                  </button>

                  <button onClick={() => setShowExportModal(true)} className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold">
                    <span className="shrink-0">{ICONS.Export}</span>
                    <span>Export</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div ref={searchAreaRef}>
                    {!showSearchBox ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchBox(true);
                          setShowReplaceBox(false);
                        }}
                        className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors"
                        title="Search segments"
                        aria-label="Search segments"
                      >
                        <Search size={14} />
                      </button>
                    ) : (
                      <div className="inline-flex flex-col gap-1 p-1.5 bg-slate-800 border border-slate-700 rounded-md min-w-[260px]">
                        <div className="inline-flex items-center gap-2 px-1 py-0.5">
                          <span className="text-slate-400"><Search size={14} /></span>
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-[12px] text-slate-100 outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setSearchCaseSensitive(prev => !prev)}
                            title="Case sensitive"
                            aria-label="Case sensitive"
                            className={`px-1 rounded text-[11px] font-semibold transition-colors ${
                              searchCaseSensitive ? 'text-blue-300 bg-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Aa
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchWholeWord(prev => !prev)}
                            title="Match whole word"
                            aria-label="Match whole word"
                            className={`px-1 rounded text-[11px] font-semibold transition-colors ${
                              searchWholeWord ? 'text-blue-300 bg-blue-500/20 underline' : 'text-slate-400 hover:text-slate-200 underline'
                            }`}
                          >
                            ab
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchRegexMode(prev => !prev)}
                            title="Regex search"
                            aria-label="Regex search"
                            className={`px-1 rounded text-[11px] font-semibold transition-colors ${
                              searchRegexMode ? 'text-blue-300 bg-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            .*
                          </button>
                        </div>

                        {showReplaceBox ? (
                          <div className="inline-flex items-center gap-2 px-1 py-0.5 border-t border-slate-700/70">
                            <span className="text-[11px] text-slate-400">R</span>
                            <input
                              ref={replaceInputRef}
                              type="text"
                              value={replaceQuery}
                              onChange={(e) => setReplaceQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleReplaceNext();
                                }
                              }}
                              placeholder="Replace"
                              className="w-full bg-transparent text-[12px] text-slate-100 outline-none placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={handleReplaceAll}
                              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200"
                              title="Replace all"
                              aria-label="Replace all"
                            >
                              All
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowReplaceBox(true);
                              setTimeout(() => replaceInputRef.current?.focus(), 0);
                            }}
                            className="self-end px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200"
                            title="Open replace box (Ctrl+H)"
                            aria-label="Open replace box"
                          >
                            Replace
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    Page {currentPage} / {totalEditorPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="rotate-180 block">{ICONS.Next}</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalEditorPages, prev + 1))}
                    disabled={currentPage === totalEditorPages}
                    className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {ICONS.Next}
                  </button>
                </div>
              </div>
            </div>
            <SegmentList 
              segments={editorSegments} 
              selectedIds={selectedIds} 
              onToggleSelect={handleToggleSelect} 
              onUpdateText={updateSegmentText} 
              onDeleteSegment={deleteSegment}
              currentPage={currentPage}
              searchQuery={searchQuery}
              searchCaseSensitive={searchCaseSensitive}
              searchWholeWord={searchWholeWord}
              searchRegexMode={searchRegexMode}
            />          </div>
          <div
            className={`bg-slate-900 transition-all duration-300 overflow-hidden ${
              showQualityDashboard ? 'w-72 border-l border-slate-800 opacity-100' : 'w-0 border-l border-transparent opacity-0 pointer-events-none'
            }`}
          >
            {showQualityDashboard && (
              <AnalyzerPanel data={allStats || ({} as AnalysisResult)} segments={segments} activeFilter={filter} onFilterTrigger={setFilter} safeThreshold={settings.cpsThreshold.safeMax} criticalThreshold={settings.cpsThreshold.warningMax} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-10 overflow-y-auto pb-24">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* AI Mode (v3.1.0) - Dropdown Selection */}
            <section className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-500">{ICONS.Fix}</span>
                <h3 className="text-lg font-bold text-slate-100">AI Mode</h3>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="ai-model-select" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Select Gemini model
                  </label>
                  <select 
                    id="ai-model-select"
                    value={settings.aiModel}
                    onChange={(e) => setSettings(prev => ({ ...prev, aiModel: e.target.value as AiModel }))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer font-bold text-sm"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2rem' }}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Efficient)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Balanced)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Latest Fast)</option>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (Highest Quality)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 relative">
                  <label htmlFor="ai-api-key-input" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Gemini API Key
                  </label>
                  <input
                    id="ai-api-key-input"
                    type="text"
                    placeholder="Enter your Gemini API Key"
                    value={settings.apiKey || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 pr-16 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
                    autoComplete="off"
                    name="gemini_api_key"
                    inputMode="text"
                    spellCheck={false}
                    style={showApiKey ? {} : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => !prev)}
                    className="absolute right-3 top-9 text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-widest"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    This key is stored locally in your browser (localStorage) and is only sent directly to Google APIs when making requests.
                  </p>
                </div>

              </div>
            </section>

            {/* API Usage Dashboard (Session-Based) */}
            <section className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-500">{ICONS.Success}</span>
                <h3 className="text-lg font-bold text-slate-100">API Usage Dashboard</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Style', 'Translate', 'Optimize'].map(key => {
                  const stats = (apiUsage as any)[key.toLowerCase()];
                  const segCount = stats.segments || 0;
                  const avgTkn = segCount > 0 ? (stats.tokens / segCount).toFixed(1) : '0';

                  const groupLabels: Record<string, string> = {
                    'Style': 'DNA Analysis',
                    'Translate': 'AI Translate',
                    'Optimize': 'AI Optimize'
                  };

                  return (
                    <div key={key} className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6">{groupLabels[key]}</div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Number of requests:</span>
                          <span className="font-bold text-slate-200">{stats.requests}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total tokens:</span>
                          <span className="font-bold text-slate-200">{stats.tokens.toLocaleString()}</span>
                        </div>
                        
                        {key === 'Translate' && (
                          <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Translated segments:</span>
                              <span className="font-bold text-emerald-400">{segCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Average tokens / segment:</span>
                              <span className="font-bold text-blue-400">{avgTkn}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-6 italic">Dashboard data is session-based and resets when you clear the project or upload a new file.</p>
            </section>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;



