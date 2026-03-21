import { 
  parseSRT, 
  parseSktProject,
  parseCapCutDraft,
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
  generateExportFileName,
  calculateCPS
} from './services/subtitleLogic';
import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Search, CopyCheck, CopyX, Eye, EyeOff } from 'lucide-react';
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
import { ICONS, DEFAULT_SETTINGS } from './constants';

const INITIAL_USAGE: ApiUsage = {
  style: { requests: 0, tokens: 0 },
  translate: { requests: 0, tokens: 0, segments: 0 },
  optimize: { requests: 0, tokens: 0 }
};
const EDITOR_PAGE_SIZE = 30;
const SegmentList = lazy(() => import('./components/SegmentList'));
const AnalyzerPanel = lazy(() => import('./components/AnalyzerPanel'));
const FileToolsPage = lazy(() => import('./components/FileToolsPage'));
const PresetPage = lazy(() => import('./components/PresetPage'));

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showTermReplaceModal, setShowTermReplaceModal] = useState<boolean>(false);
  const [optimizeHistorySegmentId, setOptimizeHistorySegmentId] = useState<number | null>(null);
  const [optimizeHistoryIndex, setOptimizeHistoryIndex] = useState<number>(0);
  const [termReplacePreview, setTermReplacePreview] = useState<{
    total: number;
    items: Array<{
      segmentId: number;
      field: 'original' | 'translated';
      find: string;
      replace_with: string;
      count: number;
      before: string;
      after: string;
    }>;
  }>({ total: 0, items: [] });
  const [termReplacePage, setTermReplacePage] = useState<number>(1);
  const [segmentToDelete, setSegmentToDelete] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'info' | 'success' | 'warning' | 'error'}>({
    message: '',
    visible: false,
    type: 'info'
  });
  const [toastHistory, setToastHistory] = useState<Array<{ id: number; message: string; time: number; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const [showToastHistory, setShowToastHistory] = useState<boolean>(false);
  const [inlineStatus, setInlineStatus] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
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
  const [isStoppingOptimize, setIsStoppingOptimize] = useState<boolean>(false);
  const [optimizeState, setOptimizeState] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewName, setVideoPreviewName] = useState<string>('');
  const [videoPanelHeight, setVideoPanelHeight] = useState<number>(220);
  const [isResizingVideoPanel, setIsResizingVideoPanel] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState<boolean>(false);
  const [searchWholeWord, setSearchWholeWord] = useState<boolean>(false);
  const [searchRegexMode, setSearchRegexMode] = useState<boolean>(false);
  const [replaceCursor, setReplaceCursor] = useState<{ segmentId: number; start: number } | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const optimizeStopRequestedRef = useRef<boolean>(false);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const toastHistoryRef = useRef<HTMLDivElement | null>(null);
  const inlineStatusTimerRef = useRef<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<SubtitleSegment[][]>([]);

  const optimizeHistorySegment = useMemo(() => {
    if (optimizeHistorySegmentId === null) return null;
    return segments.find(seg => seg.id === optimizeHistorySegmentId) || null;
  }, [segments, optimizeHistorySegmentId]);

  const handleShowOptimizeHistory = useCallback((id: number) => {
    setOptimizeHistorySegmentId(id);
    const seg = segments.find(s => s.id === id);
    const history = seg?.optimizeHistory || [];
    const currentText = seg?.translatedText || '';
    const matchedIndex = history.length > 0
      ? history.findLastIndex(h => h === currentText)
      : -1;
    const lastIndex = Math.max(0, history.length - 1);
    setOptimizeHistoryIndex(matchedIndex >= 0 ? matchedIndex : lastIndex);
  }, [segments]);

  const handleCloseOptimizeHistory = useCallback(() => {
    setOptimizeHistorySegmentId(null);
    setOptimizeHistoryIndex(0);
  }, []);

  const formatAiErrorMessage = useCallback((err: any) => {
    if (err?.error?.message) return String(err.error.message);
    if (typeof err?.message === 'string') {
      const msg = err.message.trim().replace(/^Error:\s*/i, '');
      const jsonStart = msg.indexOf('{');
      const jsonEnd = msg.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        try {
          const parsed = JSON.parse(msg.slice(jsonStart, jsonEnd + 1));
          const extracted =
            parsed?.error?.message ||
            parsed?.message ||
            parsed?.error?.status ||
            parsed?.error ||
            parsed?.status ||
            parsed?.code;
          if (extracted) return String(extracted);
        } catch {
          // fall through
        }
      }
      return msg;
    }
    return String(err || 'Unknown error');
  }, []);

  const getCpsTone = useCallback((cps: number) => {
    if (cps > settings.cpsThreshold.warningMax) {
      return { text: 'text-rose-300', bg: 'bg-rose-500' };
    }
    if (cps >= settings.cpsThreshold.safeMax) {
      return { text: 'text-amber-300', bg: 'bg-amber-500' };
    }
    return { text: 'text-emerald-300', bg: 'bg-emerald-500' };
  }, [settings.cpsThreshold]);

  const showToast = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const nextType = type;
    setToast({ message, visible: true, type: nextType });
    setToastHistory(prev => {
      const next = [{ id: Date.now() + Math.random(), message, time: Date.now(), type: nextType }, ...prev];
      return next.slice(0, 200);
    });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 6000);
  };

  const showInlineStatus = (type: 'info' | 'success' | 'warning' | 'error', message: string, durationMs: number = 5000) => {
    setInlineStatus({ type, message });
    if (inlineStatusTimerRef.current) {
      window.clearTimeout(inlineStatusTimerRef.current);
    }
    inlineStatusTimerRef.current = window.setTimeout(() => {
      setInlineStatus(null);
      inlineStatusTimerRef.current = null;
    }, durationMs);
  };

  const clearAndCloseSearch = useCallback(() => {
    setSearchQuery('');
    setReplaceQuery('');
    setReplaceCursor(null);
    setShowReplaceBox(false);
    setShowSearchBox(false);
  }, []);

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
    showToast('success', 'Undo applied.');
  }, [cloneSegments]);

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setVideoPreviewName(file.name);
    setVideoCurrentTime(0);
    const paneHeight = editorPaneRef.current?.clientHeight ?? 440;
    const maxHeight = Math.max(180, Math.min(window.innerHeight * 0.7, 560));
    const defaultHalfHeight = Math.round(paneHeight * 0.5);
    setVideoPanelHeight(Math.max(140, Math.min(maxHeight, defaultHalfHeight)));

    event.target.value = '';
  };

  const handleClearVideoPreview = () => {
    setVideoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoPreviewName('');
    setVideoCurrentTime(0);
    setIsResizingVideoPanel(false);
    videoResizeRef.current = null;
  };

  const handleStartResizeVideoPanel = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!videoPreviewUrl) return;
    videoResizeRef.current = { startY: event.clientY, startHeight: videoPanelHeight };
    setIsResizingVideoPanel(true);
    event.preventDefault();
  };

  useEffect(() => {
    if (baseFileName) {
      setFileName(generateExportFileName(baseFileName, editedCount));
    }
  }, [baseFileName, editedCount]);

  useEffect(() => {
    if (!optimizeHistorySegment) return;
    const maxIndex = Math.max(0, (optimizeHistorySegment.optimizeHistory?.length || 0) - 1);
    if (optimizeHistoryIndex > maxIndex) {
      setOptimizeHistoryIndex(maxIndex);
    }
  }, [optimizeHistorySegment, optimizeHistoryIndex]);

  useEffect(() => {
    localStorage.setItem('subtitle_settings', JSON.stringify(settings));
    if (typeof settings.apiKey === 'string' && settings.apiKey.trim()) {
      localStorage.setItem('subtitle_api_key', settings.apiKey);
    } else {
      localStorage.removeItem('subtitle_api_key');
    }
  }, [settings]);

  useEffect(() => {
    const preload = async () => {
      try {
        await import('./components/SegmentList');
        await import('./components/AnalyzerPanel');
        await import('./components/FileToolsPage');
        await import('./components/PresetPage');
      } catch {
        // ignore preload errors; lazy components will still load on demand
      }
    };

    preload();
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    if (!isResizingVideoPanel) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!videoResizeRef.current) return;
      const { startY, startHeight } = videoResizeRef.current;
      const delta = startY - event.clientY;
      const maxHeight = Math.max(180, Math.min(window.innerHeight * 0.7, 560));
      const nextHeight = Math.max(140, Math.min(maxHeight, startHeight + delta));
      setVideoPanelHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsResizingVideoPanel(false);
      videoResizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVideoPanel]);

  useEffect(() => {
    if (!showToastHistory) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!toastHistoryRef.current) return;
      if (!toastHistoryRef.current.contains(event.target as Node)) {
        setShowToastHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToastHistory]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, searchCaseSensitive, searchWholeWord, searchRegexMode]);

  const globalAnalysis = useMemo(() => {
    if (segments.length === 0) return null;
    return analyzeSegments(segments, 'translatedText', settings.cpsThreshold, settings.maxSingleLineWords);
  }, [segments, settings.cpsThreshold, settings.maxSingleLineWords]);

  const processedSegments = useMemo(() => globalAnalysis?.enrichedSegments || [], [globalAnalysis]);
  const allStats = useMemo(() => globalAnalysis?.stats, [globalAnalysis]);

  const filteredSegments = useMemo(() => {
    const hasTimelineIssue = (segment: SubtitleSegment) =>
      segment.issueList.some(issue => issue.toLowerCase().includes('timeline overlap'));
    const hasOriginLangIssue = (segment: SubtitleSegment) =>
      segment.issueList.some(issue => issue.toLowerCase().includes('original contains non-chinese characters'));
    const hasTranslatedLangIssue = (segment: SubtitleSegment) =>
      segment.issueList.some(issue => issue.toLowerCase().includes('translation contains non-vietnamese characters'));
    const hasLangIssue = (segment: SubtitleSegment) =>
      hasOriginLangIssue(segment) || hasTranslatedLangIssue(segment);
    const isTooLong = (segment: SubtitleSegment) =>
      segment.issueList.some(issue => issue.toLowerCase().includes('subtitle has more than 2 lines'));
    const isSingleLineLong = (segment: SubtitleSegment) =>
      segment.issueList.some(issue => issue.toLowerCase().includes('single-line subtitle has too many words'));

    if (filter === 'all') return processedSegments;
    if (filter === 'timeline') {
      return processedSegments.filter(hasTimelineIssue);
    }
    if (filter === 'lang') {
      return processedSegments.filter(hasLangIssue);
    }
    if (filter === 'translated') {
      return processedSegments.filter(s => (s.translatedText || '').trim() !== '');
    }
    if (filter === 'untranslated') {
      return processedSegments.filter(s => (s.translatedText || '').trim() === '');
    }
    if (filter === 'optimized') {
      return processedSegments.filter(s => (s.optimizeHistory?.length || 0) > 0);
    }
    if (filter === 'too-long') {
      return processedSegments.filter(isTooLong);
    }
    if (filter === 'single-line-long') {
      return processedSegments.filter(isSingleLineLong);
    }
    if (typeof filter === 'string') {
      return processedSegments.filter(s => s.severity === filter);
    }
    if (filter.type === 'range') {
      return processedSegments.filter(s => s.cps >= filter.min && s.cps < filter.max);
    }
    return processedSegments;
  }, [processedSegments, filter]);

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
    if (!compiled) return searchQuery.trim() ? [] : filteredSegments;
    const { regex: matcher, isIdSearch } = compiled;

    if (isIdSearch) {
      return filteredSegments.filter(s => matcher.test(s.id.toString()));
    }
    return filteredSegments.filter(s => {
      const fields = [s.startTime, s.endTime, s.originalText || '', s.translatedText || ''];
      return fields.some(field => matcher.test(field));
    });
  }, [filteredSegments, searchQuery, compileSearch]);

  const aiScope = useMemo(() => {
    const mode = selectedIds.size > 0 ? 'selected' as const : 'all' as const;
    const scopeSegments = mode === 'selected'
      ? segments.filter(s => selectedIds.has(s.id))
      : segments;
    const untranslated = scopeSegments.filter(s => !(s.translatedText || '').trim());
    const translated = scopeSegments.filter(s => (s.translatedText || '').trim());
    let action: 'translate' | 'optimize' | 'none' = 'none';
    if (untranslated.length > 0) action = 'translate';
    else if (translated.length > 0) action = 'optimize';
    return { mode, scopeSegments, untranslated, translated, action };
  }, [segments, selectedIds]);

  const aiActionTargets = aiScope.action === 'translate'
    ? aiScope.untranslated
    : aiScope.action === 'optimize'
      ? aiScope.translated
      : [];

  const aiRunningMode = translationState.status === 'running'
    ? 'translate'
    : isOptimizing
      ? 'optimize'
      : null;

  const aiButtonLabel = useMemo(() => {
    const selectedCount = selectedIds.size;
    const selectedSuffix = aiScope.mode === 'selected' ? ` (${selectedCount})` : '';
    if (aiRunningMode === 'translate') {
      return isStoppingTranslate
        ? 'Stopping...'
        : `Stop (${translationState.processed}/${translationState.total} - ${progress}%)`;
    }
    if (aiRunningMode === 'optimize') {
      return isStoppingOptimize
        ? 'Stopping...'
        : `Stop (${optimizeState.processed}/${optimizeState.total} - ${progress}%)`;
    }
    if (aiScope.action === 'translate') {
      return aiScope.mode === 'selected' ? `Translate Selected${selectedSuffix}` : 'Translate All';
    }
    if (aiScope.action === 'optimize') {
      return aiScope.mode === 'selected' ? `Optimize Selected${selectedSuffix}` : 'Optimize All';
    }
    return aiScope.mode === 'selected' ? `Translate Selected${selectedSuffix}` : 'Translate All';
  }, [
    aiRunningMode,
    aiScope.action,
    aiScope.mode,
    selectedIds,
    isStoppingTranslate,
    isStoppingOptimize,
    translationState.processed,
    translationState.total,
    optimizeState.processed,
    optimizeState.total,
    progress
  ]);

  const isAiRunning = aiRunningMode !== null;
  const aiButtonDisabled = aiRunningMode === 'translate'
    ? isStoppingTranslate
    : aiRunningMode === 'optimize'
      ? isStoppingOptimize
      : (status === 'processing' || aiScope.action === 'none' || aiActionTargets.length === 0);

  const captionTimeline = useMemo(() => {
    return segments
      .map(seg => ({
        id: seg.id,
        startSec: timeToSeconds(seg.startTime),
        endSec: timeToSeconds(seg.endTime),
        text: (seg.translatedText || seg.originalText || '').trim()
      }))
      .filter(seg => seg.text && seg.endSec >= seg.startSec);
  }, [segments]);

  const activeCaptionLines = useMemo(() => {
    if (!videoPreviewUrl) return [];
    const t = videoCurrentTime;
    return captionTimeline
      .filter(seg => t >= seg.startSec && t <= seg.endSec + 0.03)
      .map(seg => seg.text);
  }, [captionTimeline, videoCurrentTime, videoPreviewUrl]);

  const termRules = useMemo(() => {
    if (!translationPreset?.term_replacements?.length) return [];
    return translationPreset.term_replacements
      .filter(t => (t.find || '').trim() !== '')
      .map(t => ({ ...t, find: t.find.trim() }));
  }, [translationPreset]);

  const termReplaceOptions = useMemo(() => {
    return translationPreset?.term_replace_options || {
      case_sensitive: false,
      whole_word: false,
      regex: false
    };
  }, [translationPreset]);

  const buildTermRegex = useCallback((find: string) => {
    const q = find.trim();
    if (!q) return null;
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const basePattern = termReplaceOptions.regex ? q : escapeRegExp(q);
    const wrappedPattern = termReplaceOptions.whole_word
      ? `(?<![\\p{L}\\p{N}\\p{M}_])(?:${basePattern})(?![\\p{L}\\p{N}\\p{M}_])`
      : basePattern;
    const flags = `${termReplaceOptions.case_sensitive ? '' : 'i'}u`;
    try {
      return { source: wrappedPattern, flags };
    } catch {
      return null;
    }
  }, [termReplaceOptions]);

  const termReplaceCount = useMemo(() => {
    if (termRules.length === 0 || segments.length === 0) return 0;
    let total = 0;
    for (const seg of segments) {
      const fields: Array<string | null> = [seg.originalText, seg.translatedText];
      for (const text of fields) {
        if (!text) continue;
        for (const rule of termRules) {
          const built = buildTermRegex(rule.find);
          if (!built) continue;
          const regex = new RegExp(built.source, `${built.flags}g`);
          let m: RegExpExecArray | null;
          while ((m = regex.exec(text)) !== null) {
            if (!m[0].length) {
              regex.lastIndex += 1;
              continue;
            }
            total += 1;
          }
        }
      }
    }
    return total;
  }, [segments, termRules, buildTermRegex]);

  const activeCaptionSegmentId = useMemo(() => {
    if (!videoPreviewUrl) return null;
    const t = videoCurrentTime;
    const active = captionTimeline.find(seg => t >= seg.startSec && t <= seg.endSec + 0.03);
    return active?.id ?? null;
  }, [captionTimeline, videoCurrentTime, videoPreviewUrl]);

  useEffect(() => {
    if (!activeCaptionSegmentId) return;
    const index = editorSegments.findIndex(seg => seg.id === activeCaptionSegmentId);
    if (index === -1) return;
    const targetPage = Math.floor(index / EDITOR_PAGE_SIZE) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [activeCaptionSegmentId, editorSegments, currentPage]);

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
    if (count > 0) {
      showToast('success', `Replaced ${count} match(es).`);
    } else {
      showInlineStatus('info', 'No matches to replace.');
    }
  }, [compileSearch, searchQuery, segments, replaceQuery, commitSegmentsChange]);

  const buildTermReplacePreview = useCallback(() => {
    const previewItems: Array<{
      segmentId: number;
      field: 'original' | 'translated';
      find: string;
      replace_with: string;
      count: number;
      before: string;
      after: string;
    }> = [];
    if (termRules.length === 0) return { total: 0, items: previewItems };
    let total = 0;
    for (const seg of segments) {
      const fields: Array<{ key: 'original' | 'translated'; value: string | null }> = [
        { key: 'original', value: seg.originalText },
        { key: 'translated', value: seg.translatedText }
      ];
      for (const field of fields) {
        if (!field.value) continue;
        for (const rule of termRules) {
          const built = buildTermRegex(rule.find);
          if (!built) continue;
          const regex = new RegExp(built.source, `${built.flags}g`);
          let count = 0;
          const after = field.value.replace(regex, () => {
            count += 1;
            return rule.replace_with;
          });
          if (count > 0) {
            total += count;
            previewItems.push({
              segmentId: seg.id,
              field: field.key,
              find: rule.find,
              replace_with: rule.replace_with,
              count,
              before: field.value,
              after
            });
          }
        }
      }
    }
    return { total, items: previewItems };
  }, [segments, termRules, buildTermRegex]);

  const applyTermReplacements = useCallback(() => {
    if (termRules.length === 0) return;
    const updated = segments.map(seg => {
      let originalText = seg.originalText;
      let translatedText = seg.translatedText;
      for (const rule of termRules) {
        const built = buildTermRegex(rule.find);
        if (!built) continue;
        const regex = new RegExp(built.source, `${built.flags}g`);
        if (originalText) originalText = originalText.replace(regex, rule.replace_with);
        if (translatedText) translatedText = translatedText.replace(regex, rule.replace_with);
      }
      if (originalText === seg.originalText && translatedText === seg.translatedText) return seg;
      return { ...seg, originalText, translatedText };
    });
    commitSegmentsChange(updated);
  }, [segments, termRules, buildTermRegex, commitSegmentsChange]);

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
      const isSpaceToggle = !event.ctrlKey && !event.metaKey && !event.altKey && (event.code === 'Space' || event.key === ' ');
      const isEscape = event.key === 'Escape';
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
      if (isSpaceToggle && !isTypingTarget && videoPreviewUrl && videoElementRef.current) {
        event.preventDefault();
        const video = videoElementRef.current;
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
      if (isEscape && showSearchBox) {
        event.preventDefault();
        clearAndCloseSearch();
      }
    };
    window.addEventListener('keydown', handleFindShortcut);
    return () => window.removeEventListener('keydown', handleFindShortcut);
  }, [activeTab, segments.length, handleUndoSegments, videoPreviewUrl, showSearchBox, clearAndCloseSearch]);

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
    showToast('success', "File name copied to clipboard");
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSeekToSegmentStart = useCallback((segmentId: number) => {
    if (!videoPreviewUrl || !videoElementRef.current) return;
    const target = segments.find(seg => seg.id === segmentId);
    if (!target) return;
    const startSec = Math.max(0, timeToSeconds(target.startTime));
    videoElementRef.current.currentTime = startSec;
    setVideoCurrentTime(startSec);
  }, [segments, videoPreviewUrl]);

  const handleSelectAll = () => {
    if (selectedIds.size === editorSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(editorSegments.map(s => s.id)));
    }
  };

  const displayFileName = fileName.toLowerCase().endsWith('.srt')
    ? fileName.slice(0, -4)
    : fileName;

  const handleDNAAnalyze = async (input: string) => {
    if (!settings.apiKey?.trim()) {
      showInlineStatus('warning', "Please enter your Gemini API Key in Settings.");
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

      showToast('success', "DNA analysis complete. Translation style initialized.");
    } catch (err) {
      console.error("DNA analysis failed", err);
      showToast('error', "Failed to analyze translation style.");
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
                        typeof json.humor_level === 'number';

        if (isValid) {
          const termReplacements = Array.isArray(json.term_replacements)
            ? json.term_replacements
                .filter((t: any) => t && typeof t.find === 'string' && typeof t.replace_with === 'string')
                .map((t: any, i: number) => ({
                  id: typeof t.id === 'number' && Number.isFinite(t.id) ? t.id : i + 1,
                  find: t.find,
                  replace_with: t.replace_with
                }))
            : [];
          const termReplaceOptions = {
            case_sensitive: !!json.term_replace_options?.case_sensitive,
            whole_word: !!json.term_replace_options?.whole_word,
            regex: !!json.term_replace_options?.regex
          };
          const cleaned: TranslationPreset = {
            reference: { title_or_summary: json.reference.title_or_summary },
            genres: json.genres,
            term_replacements: termReplacements,
            term_replace_options: termReplaceOptions,
            humor_level: json.humor_level
          };
          setTranslationPreset(cleaned);
          showToast('success', "DNA preset imported successfully.");
        } else {
          showToast('error', "Invalid DNA file or incompatible version.");
        }
      } catch (err) {
        showToast('error', "Error while reading DNA file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.srt') && !ext.endsWith('.sktproject') && !ext.endsWith('.json')) {
      alert('Please select a .srt, .sktproject, or CapCut draft_content.json file.');
      setStatus('error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB.');
      setStatus('error');
      return;
    }

    const { baseName, editedCount: count } = parseFileName(file.name);
    setBaseFileName(baseName);
    setEditedCount(count);

    setIsFileLoading(true);
    setStatus('processing');
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      // Allow UI to paint loading state before heavy parsing
      setTimeout(() => {
        try {
          let parsedSegments: SubtitleSegment[] = [];
          let preset: TranslationPreset | null = null;

          if (ext.endsWith('.srt')) {
            parsedSegments = parseSRT(content);
            setProjectCreatedAt(new Date().toISOString());
          } else if (ext.endsWith('.sktproject')) {
            const res = parseSktProject(content);
            parsedSegments = res.segments;
            preset = res.preset || null;
            setProjectCreatedAt(null);
          } else {
            const res = parseCapCutDraft(content);
            parsedSegments = res.segments;
            setProjectCreatedAt(null);
          }
          
          if (parsedSegments.length === 0) {
            if (ext.endsWith('.json')) {
              alert('Invalid CapCut draft_content.json format. Please upload the correct file and try again.');
            } else {
              alert('File has no valid segments or has an invalid format.');
            }
            setStatus('error');
            setIsFileLoading(false);
            return;
          }

          parsedSegments = parsedSegments.map(s => ({
            ...s,
            originalText: performLocalFix(s.originalText || ""),
            translatedText: performLocalFix(s.translatedText || "")
          }));

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
          setIsFileLoading(false);
        } catch (err) {
          if (ext.endsWith('.json')) {
            alert('Invalid CapCut draft_content.json format. Please upload the correct file and try again.');
          } else {
            alert('Error while parsing file: ' + (err as Error).message);
          }
          setStatus('error');
          setIsFileLoading(false);
        }
      }, 0);
    };
    reader.onerror = () => {
      setStatus('error');
      alert('Error while reading file.');
      setIsFileLoading(false);
    };
    reader.readAsText(file);
  }, []);

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
    if (!skipFeedback) showToast('success', "Project has been cleared.");
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
      showInlineStatus('warning', "Please enter your Gemini API Key in Settings.");
      setActiveTab('settings');
      return;
    }
    if (segments.length === 0) return;
    const selectedMode = aiScope.mode === 'selected';
    const needingTranslation = aiScope.untranslated;
    if (needingTranslation.length === 0) {
      showInlineStatus('warning', selectedMode ? "Selected segments are already translated." : "All segments are already translated.");
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      return;
    }
    if (!translationPreset) {
      showInlineStatus('warning', "Please configure Translation Style first.");
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
      let queue = [...needingTranslation];
      while (queue.length > 0) {
        if (stopRequestedRef.current) {
          setTranslationState(prev => ({ ...prev, status: 'stopped' }));
          setIsStoppingTranslate(false);
          showInlineStatus('info', "Translation process has been stopped.");
          setStatus('success');
          return;
        }
        const currentBatch = queue.slice(0, batchSize);
        const firstIdx = segments.findIndex(s => s.id === currentBatch[0].id);
        const lastIdx = segments.findIndex(s => s.id === currentBatch[currentBatch.length - 1].id);
        const contextBefore = segments.slice(Math.max(0, firstIdx - 2), firstIdx).map(s => s.originalText || "");
        const contextAfter = segments.slice(lastIdx + 1, Math.min(segments.length, lastIdx + 3)).map(s => s.originalText || "");
        setSegments(prev => prev.map(s => currentBatch.some(cb => cb.id === s.id) ? { ...s, isProcessing: true } : s));
        const { translatedTexts, tokens } = await translateBatch(currentBatch, contextBefore, contextAfter, translationPreset, settings.aiModel, settings.apiKey);
        const translationMap = new Map<number, string>();
        for (const item of translatedTexts) {
          if (item && typeof item.id === 'number' && typeof item.text === 'string' && item.text.trim().length > 0) {
            translationMap.set(item.id, item.text);
          }
        }

        const usableCount = currentBatch.filter(s => translationMap.has(s.id)).length;
        if (usableCount === 0) {
          throw new Error("AI returned no results for this batch. Translation cannot continue.");
        }

        setSegments(prev => prev.map(s => {
          if (translationMap.has(s.id)) {
            return { ...s, translatedText: translationMap.get(s.id), isProcessing: false };
          }
          if (currentBatch.some(cb => cb.id === s.id)) return { ...s, isProcessing: false };
          return s;
        }));
        completedInSession += usableCount;
        setApiUsage(prev => ({ ...prev, translate: { requests: prev.translate.requests + 1, tokens: prev.translate.tokens + tokens, segments: (prev.translate.segments || 0) + usableCount } }));
        setTranslationState(prev => ({ ...prev, processed: completedInSession }));
        setProgress(Math.floor((completedInSession / totalToTranslateInSession) * 100));

        // Drop only translated items; missing segments stay at the front for the next batch
        const translatedIds = new Set(Array.from(translationMap.keys()));
        queue = queue.filter(s => !translatedIds.has(s.id));
      }
      setTranslationState(prev => ({ ...prev, status: 'completed' }));
      setIsStoppingTranslate(false);
      setStatus('success');
      showToast('success', selectedMode ? "Selected segments translated." : "All segments translated.");
    } catch (err: any) {
      setStatus('error');
      setTranslationState(prev => ({ ...prev, status: 'error' }));
      setIsStoppingTranslate(false);
      showToast('error', `Error: ${formatAiErrorMessage(err)}`);
      setSegments(prev => prev.map(s => ({ ...s, isProcessing: false })));
    }
  };

  const handleStopTranslate = () => {
    if (isStoppingTranslate) return;
    stopRequestedRef.current = true;
    setIsStoppingTranslate(true);
    showInlineStatus('info', "Stopping translation...");
  };

  const handleAiOptimize = async () => {
    if (!settings.apiKey?.trim()) {
      showInlineStatus('warning', "Please enter your Gemini API Key in Settings.");
      setActiveTab('settings');
      return;
    }
    if (aiScope.translated.length === 0) {
      showInlineStatus('warning', aiScope.mode === 'selected' ? "Selected segments are not translated yet." : "All segments are not translated yet.");
      return;
    }
    setIsOptimizing(true);
    setIsStoppingOptimize(false);
    optimizeStopRequestedRef.current = false;
    setStatus('processing');
    setProgress(0);
    setOptimizeState({ processed: 0, total: 0 });

    let safeCount = 0;
    let optimizedCount = 0;
    let requestCount = 0;
    let untranslatedSkippedCount = Math.max(0, aiScope.scopeSegments.length - aiScope.translated.length);
    let hadOptimizeErrors = false;

    const currentSegments = [...segments];
    const aiTargetSegments: SubtitleSegment[] = [];
    const optimizeTargets = aiScope.translated;
    for (const seg of optimizeTargets) {
      const meta = analyzeSegments([seg], 'translatedText', settings.cpsThreshold, settings.maxSingleLineWords);
      const severity = meta.enrichedSegments[0].severity;

      if (severity === 'safe') {
        safeCount++;
      } else {
        aiTargetSegments.push(seg);
      }
    }

    if (aiTargetSegments.length > 0) {
      const batchSize = 20;
      let processedForOptimize = 0;
      setOptimizeState({ processed: 0, total: aiTargetSegments.length });

      try {
        for (let i = 0; i < aiTargetSegments.length; i += batchSize) {
          if (optimizeStopRequestedRef.current) {
            break;
          }
          const currentBatch = aiTargetSegments.slice(i, i + batchSize);
          const batchIdx = Math.floor(i / batchSize) + 1;

          const { segments: fixed, tokens } = await aiFixSegments(currentBatch, translationPreset, settings.aiModel, settings.apiKey);
          requestCount++;
          
          fixed.forEach(f => {
            const idx = currentSegments.findIndex(s => s.id === f.id);
            if (idx !== -1) {
              const prev = currentSegments[idx];
              const prevText = prev.translatedText || '';
              const nextText = f.translatedText || '';
              let nextHistory = prev.optimizeHistory ? [...prev.optimizeHistory] : [];

              if (nextText) {
                if (nextHistory.length === 0) {
                  if (prevText) nextHistory.push(prevText);
                  nextHistory.push(nextText);
                } else {
                  const last = nextHistory[nextHistory.length - 1];
                  if (last !== nextText) nextHistory.push(nextText);
                }
              }

              currentSegments[idx] = {
                ...prev,
                ...f,
                translatedText: nextText || prev.translatedText,
                optimizeHistory: nextHistory
              };
              if (nextText && nextText !== prevText) optimizedCount++;
            }
          });
          
          setApiUsage(prev => ({ 
            ...prev, 
            optimize: { requests: prev.optimize.requests + 1, tokens: prev.optimize.tokens + tokens } 
          }));

          const progressPercent = Math.floor(((i + currentBatch.length) / aiTargetSegments.length) * 100);
          processedForOptimize = Math.min(aiTargetSegments.length, i + currentBatch.length);
          setOptimizeState({ processed: processedForOptimize, total: aiTargetSegments.length });
          setProgress(progressPercent);
        }
      } catch (err: any) {
        hadOptimizeErrors = true;
        console.error("Error processing optimize batch", err);
        setStatus('error');
        setIsOptimizing(false);
        setIsStoppingOptimize(false);
        optimizeStopRequestedRef.current = false;
        setOptimizeState({ processed: 0, total: 0 });
        showToast('error', `Error: ${formatAiErrorMessage(err) || 'Optimization failed.'}`);
        return;
      }
    }

    const wasStopped = optimizeStopRequestedRef.current;
    commitSegmentsChange(currentSegments);
    if (!wasStopped) setProgress(100);
    if (hadOptimizeErrors && requestCount === 0) {
      setStatus('error');
    } else if (hadOptimizeErrors) {
      setStatus('partial-success');
    } else {
      setStatus('success');
    }
    setIsOptimizing(false);
    setIsStoppingOptimize(false);
    optimizeStopRequestedRef.current = false;
    setOptimizeState({ processed: 0, total: 0 });
    if (!wasStopped) {
      setSelectedIds(new Set());
    }
    
    if (wasStopped) {
      showInlineStatus('warning', `Optimization stopped: Skipped ${safeCount} safe segments, skipped ${untranslatedSkippedCount} untranslated segments, optimized ${optimizedCount} segments so far.`);
      return;
    }
    if (hadOptimizeErrors && requestCount === 0) {
      showToast('error', "Optimization failed due to API errors. Please try again.");
      return;
    }
    if (hadOptimizeErrors) {
      showToast('warning', `Optimization finished with errors: Skipped ${safeCount} safe segments, skipped ${untranslatedSkippedCount} untranslated segments, AI optimized ${optimizedCount} segments. Total requests: ${requestCount}.`);
      return;
    }
    if (optimizedCount === 0) {
      showInlineStatus('info', `Optimization finished: No changes applied. Skipped ${safeCount} safe segments, skipped ${untranslatedSkippedCount} untranslated segments. Total requests: ${requestCount}.`);
      return;
    }
    showToast('success', `Optimization finished: Skipped ${safeCount} safe segments, skipped ${untranslatedSkippedCount} untranslated segments, AI optimized ${optimizedCount} segments. Total requests: ${requestCount}.`);
  };

  const handleStopOptimize = () => {
    if (isStoppingOptimize) return;
    optimizeStopRequestedRef.current = true;
    setIsStoppingOptimize(true);
    showInlineStatus('info', "Stopping optimization...");
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

  const handleDownloadChoice = (type: 'project' | 'srt-orig' | 'srt-tran' | 'preset') => {
    setShowExportModal(false);
    if (type === 'project') {
      const json = generateSktProject(segments, baseFileName, translationPreset, projectCreatedAt || undefined);
      const name = generateExportFileName(baseFileName, editedCount, '.sktproject');
      downloadFile(json, name);
      setEditedCount(prev => prev + 1);
      showToast('success', "Project saved.");
    } else if (type === 'srt-orig') {
      const srt = generateSRT(segments, 'original');
      const name = `[Origin]${generateExportFileName(baseFileName, editedCount, '.srt')}`;
      downloadFile(srt, name);
      showToast('success', "Original SRT exported.");
    } else if (type === 'srt-tran') {
      const srt = generateSRT(segments, 'translated');
      const name = `[Translated]${generateExportFileName(baseFileName, editedCount, '.srt')}`;
      downloadFile(srt, name);
      showToast('success', "Translated SRT exported.");
    } else if (type === 'preset') {
      if (!translationPreset) {
      showToast('warning', "No translation preset to export.");
        return;
      }
      handleExportPreset();
      showToast('success', "Preset exported.");
    }
  };

  const handleSplitConfirm = async (mode: 'duration' | 'count' | 'manual' | 'range', value: any, includeMetadata: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    let res: SplitResult[] = [];
    if (mode === 'duration') res = splitByDuration(segments, value as number, fileName, includeMetadata);
    else if (mode === 'count') res = splitByCount(segments, value as number, fileName, includeMetadata);
    else if (mode === 'manual') res = splitByManual(segments, (value as string).split('\n').filter(x => x.trim()), fileName, includeMetadata);
    else if (mode === 'range') res = splitByRange(segments, value.start, value.end, fileName, includeMetadata);
    if (res.length > 0) { setGeneratedFiles(prev => [...prev, ...res]); showToast('success', `File has been split into ${res.length} parts.`); }
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
    showInlineStatus('info', "Temporary split file removed.");
  };

  const updateSegmentText = (id: number, text: string) => {
    commitSegmentsChange(prev => prev.map(s => s.id === id ? { ...s, translatedText: text } : s));
  };

  const updateSegmentTime = (id: number, field: 'startTime' | 'endTime', value: string) => {
    commitSegmentsChange(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
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
    showToast('success', "Segment deleted and indices have been re-numbered.");
  };

  const updateThreshold = (key: 'safeMax' | 'warningMax', val: number) => {
    setSettings(prev => {
      const nt = { ...prev.cpsThreshold, [key]: val };
      if (key === 'safeMax' && val >= nt.warningMax) nt.warningMax = val + 1;
      else if (key === 'warningMax' && val <= nt.safeMax) nt.safeMax = Math.max(0, val - 1);
      return { ...prev, cpsThreshold: nt };
    });
  };

  const handleOpenTermReplace = () => {
    const preview = buildTermReplacePreview();
    setTermReplacePreview(preview);
    if (preview.total > 0) {
      setTermReplacePage(1);
      setShowTermReplaceModal(true);
    }
  };

  const handleConfirmTermReplace = () => {
    if (termReplacePreview.total === 0) {
      setShowTermReplaceModal(false);
      return;
    }
    applyTermReplacements();
    setShowTermReplaceModal(false);
    showToast('success', `Auto replaced ${termReplacePreview.total} match(es).`);
  };

  const renderTermReplacePreview = (text: string, find: string, replaceWith: string) => {
    const built = buildTermRegex(find);
    if (!built) return text;
    const regex = new RegExp(built.source, `${built.flags}g`);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      if (!matchText) {
        regex.lastIndex += 1;
        continue;
      }
      const start = match.index;
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      parts.push(
        <span key={`${start}-${matchText}`} className="inline-flex items-center gap-1 mx-0.5">
          <span className="px-1 rounded bg-rose-500/15 text-rose-300 line-through">{matchText}</span>
          <span className="px-1 rounded bg-emerald-500/15 text-emerald-300">{replaceWith}</span>
        </span>
      );
      lastIndex = start + matchText.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  const toastTone = {
    info: {
      container: 'bg-slate-900 border-slate-700 text-blue-300',
      icon: ICONS.Notification
    },
    success: {
      container: 'bg-emerald-950 border-emerald-500/50 text-emerald-200',
      icon: ICONS.Success
    },
    warning: {
      container: 'bg-amber-950 border-amber-500/50 text-amber-200',
      icon: ICONS.Warning
    },
    error: {
      container: 'bg-rose-950 border-rose-500/50 text-rose-200',
      icon: ICONS.Error
    }
  } as const;

  const inlineTone = {
    info: {
      container: 'bg-slate-900 border-slate-700 text-slate-200',
      icon: ICONS.Notification
    },
    success: {
      container: 'bg-emerald-950 border-emerald-500/40 text-emerald-200',
      icon: ICONS.Success
    },
    warning: {
      container: 'bg-amber-950 border-amber-500/40 text-amber-200',
      icon: ICONS.Warning
    },
    error: {
      container: 'bg-rose-950 border-rose-500/40 text-rose-200',
      icon: ICONS.Error
    }
  } as const;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} progress={progress} hasProject={segments.length > 0} onClearProject={handleClearProjectRequest} onExportProject={() => setShowExportModal(true)}>
      {toast.visible && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] border px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${toastTone[toast.type].container}`}>
          <p className="text-sm font-bold flex items-center gap-2">
            {toastTone[toast.type].icon}
            <span>{toast.message}</span>
          </p>
        </div>
      )}
      {inlineStatus && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[190] pointer-events-none">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs sm:text-[13px] font-semibold shadow-lg ${inlineTone[inlineStatus.type].container}`}>
            <span className="shrink-0">{inlineTone[inlineStatus.type].icon}</span>
            <span>{inlineStatus.message}</span>
          </div>
        </div>
      )}

      {isFileLoading && (
        <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-slate-200 text-sm font-bold">
              {ICONS.Upload}
              <span>Loading file, please wait...</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Parsing subtitles and preparing editor.</div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8">
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
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8">
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
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 animate-in zoom-in duration-200">
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

      {showTermReplaceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg sm:max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2">Confirm Auto Replace</h3>
            <p className="text-slate-400 text-sm mb-4">
              {termReplacePreview.total} replacement(s) will be applied across original and translated fields.
            </p>
            <div className="max-h-[280px] sm:max-h-[360px] overflow-y-auto border border-slate-800 rounded-2xl p-3 space-y-3 bg-slate-950/40">
              {termReplacePreview.items.length === 0 ? (
                <div className="text-slate-500 text-sm">No matches found.</div>
              ) : (
                (() => {
                  const segmentIds = Array.from(new Set(termReplacePreview.items.map(i => i.segmentId)));
                  const totalPages = Math.max(1, Math.ceil(segmentIds.length / 10));
                  const safePage = Math.min(termReplacePage, totalPages);
                  const start = (safePage - 1) * 10;
                  const pageSegmentIds = new Set(segmentIds.slice(start, start + 10));
                  const pageItems = termReplacePreview.items.filter(i => pageSegmentIds.has(i.segmentId));
                  return pageItems.map((item, idx) => (
                    <div key={`${item.segmentId}-${item.field}-${item.find}-${idx}`} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        <span>Segment #{item.segmentId} · {item.field}</span>
                      </div>
                    <div className="text-[12px] text-slate-300 mb-2">
                      <span className="font-bold text-slate-200">{item.find}</span> → <span className="font-bold text-cyan-300">{item.replace_with}</span>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 whitespace-pre-wrap">
                      {renderTermReplacePreview(item.before, item.find, item.replace_with)}
                    </div>
                  </div>
                ));
              })()
            )}
            </div>
            {termReplacePreview.items.length > 0 && (() => {
              const segmentIds = Array.from(new Set(termReplacePreview.items.map(i => i.segmentId)));
              const totalPages = Math.max(1, Math.ceil(segmentIds.length / 10));
              const safePage = Math.min(termReplacePage, totalPages);
              return (
                <div className="flex items-center justify-between mt-4 text-[11px] text-slate-400">
                  <span>
                    Page {safePage} / {totalPages} · {segmentIds.length} segments
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTermReplacePage(prev => Math.max(1, prev - 1))}
                      disabled={safePage <= 1}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setTermReplacePage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safePage >= totalPages}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTermReplaceModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">Cancel</button>
              <button onClick={handleConfirmTermReplace} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-colors">Apply</button>
            </div>
          </div>
        </div>
      )}

      {optimizeHistorySegmentId !== null && optimizeHistorySegment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 animate-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Optimize History</h3>
                <div className="text-xs text-slate-400">
                  Segment #{optimizeHistorySegment.id} · {optimizeHistorySegment.startTime} → {optimizeHistorySegment.endTime}
                </div>
              </div>
              <button
                onClick={handleCloseOptimizeHistory}
                className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                aria-label="Close"
                title="Close"
              >
                {ICONS.Close}
              </button>
            </div>

            {(optimizeHistorySegment.optimizeHistory?.length || 0) === 0 ? (
              <div className="mt-6 text-slate-400 text-sm">No optimize history found for this segment.</div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Origin</div>
                  <div className="text-[12px] text-slate-300 whitespace-pre-wrap break-words">
                    {optimizeHistorySegment.originalText || <span className="text-slate-600 italic">No original text</span>}
                  </div>
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {optimizeHistorySegment.optimizeHistory?.map((entry, idx) => {
                    const cps = calculateCPS(optimizeHistorySegment, entry || '');
                    const colors = getCpsTone(cps);
                    const isActive = idx === optimizeHistoryIndex;
                    return (
                      <button
                        key={`${optimizeHistorySegment.id}-${idx}`}
                        onClick={() => {
                          setOptimizeHistoryIndex(idx);
                          commitSegmentsChange(prev => prev.map(seg => (
                            seg.id === optimizeHistorySegment.id
                              ? { ...seg, translatedText: entry || seg.translatedText }
                              : seg
                          )));
                        }}
                        className={`w-full text-left grid grid-cols-[minmax(240px,1.6fr)_90px] gap-2 px-3 py-2 rounded-xl border transition ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-[12px] text-blue-100 whitespace-pre-wrap break-words">
                          {entry || <span className="text-slate-600 italic">Empty</span>}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-[11px] font-bold font-mono ${colors.text}`}>
                            {cps.toFixed(1)}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg sm:max-w-xl rounded-[22px] sm:rounded-[28px] shadow-2xl p-5 sm:p-6 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-4">Download</h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleDownloadChoice('project')}
                  className="w-full min-h-[74px] p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-left hover:bg-blue-600/20 transition-all group flex flex-col justify-between"
                >
                  <span className="block font-bold text-blue-400">Save Project (.sktproject)</span>
                  <span className="text-[10px] text-slate-500">Save full project state for later editing.</span>
                </button>
                <button
                  onClick={() => handleDownloadChoice('preset')}
                  disabled={!translationPreset}
                  className="w-full min-h-[74px] p-3.5 bg-cyan-600/10 border border-cyan-500/20 rounded-xl text-left hover:bg-cyan-600/20 transition-all group flex flex-col justify-between disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-600/10"
                >
                  <span className="block font-bold text-cyan-400">Export Translation Style (.json)</span>
                  <span className="text-[10px] text-slate-500">Translation style DNA preset.</span>
                </button>
                <button
                  onClick={() => handleDownloadChoice('srt-tran')}
                  className="w-full min-h-[74px] p-3.5 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-left hover:bg-emerald-600/20 transition-all group flex flex-col justify-between"
                >
                  <span className="block font-bold text-emerald-400">Export Translated (.srt)</span>
                  <span className="text-[10px] text-slate-500">Translated Vietnamese version.</span>
                </button>
                <button
                  onClick={() => handleDownloadChoice('srt-orig')}
                  className="w-full min-h-[74px] p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-left hover:bg-slate-700 transition-all group flex flex-col justify-between"
                >
                  <span className="block font-bold text-slate-400">Export Original (.srt)</span>
                  <span className="text-[10px] text-slate-500">Original Chinese version.</span>
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
        <div className="relative bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 z-40 overflow-visible">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg shrink-0">{ICONS.File}</div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-slate-100 truncate cursor-pointer" onClick={() => copyToClipboard(displayFileName)}>{displayFileName}</h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{processedSegments.length} SEGMENTS</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700"></span>
                <span className="hidden sm:inline">{allStats?.avgCPS.toFixed(1) || 0} AVG CPS</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700"></span>
                <span>{totalDurationStr}</span>
              </div>
            </div>
          </div>
          {activeTab === 'editor' && (
            <div className="shrink-0 sm:ml-4 flex items-start gap-2">
              <div ref={searchAreaRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchBox(prev => !prev);
                    if (!showSearchBox) {
                      setShowReplaceBox(false);
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    }
                  }}
                  className={`inline-flex items-center justify-center w-7 h-7 p-0 leading-none rounded-md border transition-colors ${
                    showSearchBox
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'
                  }`}
                  title="Search segments"
                  aria-label="Search segments"
                >
                  <Search size={14} />
                </button>

                {showSearchBox && (
                  <div className="absolute right-0 top-0 -mt-1 z-[60] flex items-stretch p-0.5 bg-slate-800 border border-slate-700 rounded-md min-w-[140px] sm:min-w-[180px] shadow-xl overflow-hidden">
                    <div className="w-[22px] shrink-0 border-r border-slate-700/70 flex">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReplaceBox(prev => !prev);
                          if (!showReplaceBox) {
                            setTimeout(() => replaceInputRef.current?.focus(), 0);
                          }
                        }}
                        title={showReplaceBox ? "Hide replace" : "Show replace"}
                        aria-label={showReplaceBox ? "Hide replace" : "Show replace"}
                        className={`flex-1 flex items-center justify-center transition-all ${showReplaceBox ? 'text-blue-300 rotate-90' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {ICONS.Next}
                      </button>
                    </div>

                    <div className="flex flex-col min-w-0 pl-0.5">
                      <div className="inline-flex items-center gap-1 px-0.5 py-0.5">
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search"
                          className="w-full min-w-[120px] sm:min-w-[160px] bg-transparent text-[12px] text-slate-100 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setSearchCaseSensitive(prev => !prev)}
                          title="Case sensitive"
                          aria-label="Case sensitive"
                          className={`px-0.5 rounded text-[11px] font-semibold transition-colors ${
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
                          className={`px-0.5 rounded text-[11px] font-semibold transition-colors ${
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
                          className={`px-0.5 rounded text-[11px] font-semibold transition-colors ${
                            searchRegexMode ? 'text-blue-300 bg-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          .*
                        </button>
                        <button
                          type="button"
                          onClick={clearAndCloseSearch}
                          title="Clear and close search"
                          aria-label="Clear and close search"
                          className="ml-1 px-1.5 rounded text-[12px] font-bold text-slate-300 border border-slate-700/60 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"
                        >
                          x
                        </button>
                      </div>

                      {showReplaceBox ? (
                        <div className="inline-flex items-center gap-2 px-1 py-0.5 border-t border-slate-700/70">
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
                            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200"
                            title="Replace all"
                            aria-label="Replace all"
                          >
                            All
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div ref={toastHistoryRef} className="relative">
                <button
                  onClick={() => setShowToastHistory(prev => !prev)}
                  aria-label="Notification history"
                  title="Notification history"
                  className="inline-flex items-center justify-center w-7 h-7 p-0 leading-none rounded-md bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors"
                >
                  <span className="shrink-0">{ICONS.Notification}</span>
                </button>

                {showToastHistory && (
                  <div className="absolute right-0 mt-2 z-[60] w-[320px] max-h-[420px] bg-slate-800/90 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-blue-500/15">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-900/70">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notification</div>
                      <button
                        onClick={() => setShowToastHistory(false)}
                        aria-label="Close notification history"
                        title="Close"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                      >
                        {ICONS.Close}
                      </button>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto p-3 space-y-2 bg-slate-900/50">
                      {toastHistory.length === 0 ? (
                        <div className="text-sm text-slate-500">No notifications yet.</div>
                      ) : (
                        toastHistory.map(item => (
                          <div key={item.id} className={`border rounded-xl px-3 py-2 ${
                            item.type === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : item.type === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : item.type === 'error'
                                  ? 'bg-rose-500/10 border-rose-500/30'
                                  : 'bg-slate-950/60 border-slate-800'
                          }`}>
                            <div className="text-[10px] text-slate-500 mb-1">
                              {new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className={`text-sm flex items-center gap-2 ${
                              item.type === 'success'
                                ? 'text-emerald-200'
                                : item.type === 'warning'
                                  ? 'text-amber-200'
                                  : item.type === 'error'
                                    ? 'text-rose-200'
                                    : 'text-slate-200'
                            }`}>
                              <span className="shrink-0">
                                {item.type === 'success'
                                  ? ICONS.Success
                                  : item.type === 'warning'
                                    ? ICONS.Warning
                                    : item.type === 'error'
                                      ? ICONS.Error
                                      : ICONS.Notification}
                              </span>
                              <span className="toast-message line-clamp-2" title={item.message}>
                                {item.message}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/50" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 tracking-tight">Subtitle Toolkit</h1>
            <p className="text-slate-400 mb-6 sm:mb-8 text-sm sm:text-base">Professional subtitle translation and optimization.</p>
            <label className={`relative group flex flex-col items-center justify-center w-full h-52 sm:h-64 border-2 border-dashed rounded-3xl cursor-pointer ${isDragging ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-slate-800'}`}>
              <input type="file" accept=".srt,.sktproject,.json" className="hidden" onChange={handleFileUpload} />
              <div className="p-4 sm:p-5 bg-blue-600/10 rounded-full border border-blue-500/20 mb-4 sm:mb-5">{ICONS.Upload}</div>
              <p className="text-base sm:text-lg font-bold text-slate-200">Drag & drop .srt/.sktproject/CapCut draft_content.json here</p>
            </label>
          </div>
          {isFileLoading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-40">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-center shadow-2xl">
                <div className="flex items-center justify-center gap-2 text-slate-200 text-sm font-bold">
                  {ICONS.Upload}
                  <span>Loading file, please wait...</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">Parsing subtitles and preparing editor.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'translation-style' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading translation style tools...</div>}>
          <PresetPage preset={translationPreset} isLoading={isPresetLoading} onAnalyze={handleDNAAnalyze} onImport={handleImportPreset} onUpdatePreset={setTranslationPreset} fileName={fileName} totalSegments={segments.length} />
        </Suspense>
      )}

      {activeTab === 'file-tools' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading file tools...</div>}>
          <FileToolsPage fileName={fileName} totalSegments={segments.length} segments={segments} onSplitConfirm={handleSplitConfirm} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
        </Suspense>
      )}

      {activeTab === 'editor' && segments.length > 0 && (
        <div className="flex-1 flex overflow-hidden relative">
          <div ref={editorPaneRef} className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <div className="px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    onClick={handleSelectAll}
                    title={editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id)) ? 'Deselect all' : 'Select all'}
                    aria-label={editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id)) ? 'Deselect all segments' : 'Select all segments'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id))
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {editorSegments.length > 0 && editorSegments.every(s => selectedIds.has(s.id))
                      ? <CopyX size={16} />
                      : <CopyCheck size={16} />}
                  </button>

                  <select
                    value={typeof filter === 'string' ? filter : 'all'}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="all">All</option>
                    <option value="safe">Safe</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="timeline">Timeline Issues</option>
                    <option value="lang">Language Issues</option>
                    <option value="too-long">Too Long (3+ lines)</option>
                    <option value="single-line-long">Single Line Too Long</option>
                    <option value="translated">Translated</option>
                    <option value="untranslated">Untranslated</option>
                    <option value="optimized">Optimized</option>
                  </select>

                  <button
                    onClick={() => {
                      if (aiRunningMode === 'translate') {
                        handleStopTranslate();
                        return;
                      }
                      if (aiRunningMode === 'optimize') {
                        handleStopOptimize();
                        return;
                      }
                      if (aiScope.action === 'translate') {
                        handleTranslate();
                        return;
                      }
                      if (aiScope.action === 'optimize') {
                        handleAiOptimize();
                      }
                    }}
                    disabled={aiButtonDisabled}
                    className={`relative overflow-hidden inline-flex items-center justify-center w-auto gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors ${
                      isAiRunning
                        ? 'bg-rose-600/80 border border-rose-500/50 text-rose-100 hover:bg-rose-500/80 disabled:opacity-70'
                        : 'bg-blue-700/70 border border-blue-500/40 text-blue-100 hover:bg-blue-600/70 disabled:opacity-60 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isAiRunning && (
                      <span
                        className="absolute left-0 top-0 h-full bg-white/10 pointer-events-none"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                    <span className="relative z-10 shrink-0">{ICONS.AI}</span>
                    <span className="relative z-10 whitespace-nowrap">
                      {aiButtonLabel}
                    </span>
                  </button>

                  {termReplaceCount > 0 && (
                    <button
                      onClick={handleOpenTermReplace}
                      disabled={status === 'processing'}
                      title={`${termReplaceCount} replacement(s) will be applied`}
                      aria-label="Auto replace by term rules"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold transition-colors bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                    >
                      <span className="shrink-0">{ICONS.Replace}</span>
                      <span>Auto Replace</span>
                    </button>
                  )}

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-[10px] sm:text-[11px] font-bold hover:bg-slate-700 transition-colors"
                  >
                    <span className="shrink-0">{ICONS.Upload}</span>
                    <span>Preview</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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
                  <button
                    type="button"
                    onClick={() => setShowQualityDashboard(prev => !prev)}
                    className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center"
                    aria-label={showQualityDashboard ? 'Hide issues panel' : 'Show issues panel'}
                    title={showQualityDashboard ? 'Hide issues panel' : 'Show issues panel'}
                  >
                    <span className="sr-only">{showQualityDashboard ? 'Hide issues panel' : 'Show issues panel'}</span>
                    <span className="flex flex-col gap-1">
                      <span className="block w-3 h-[2px] bg-current rounded-full"></span>
                      <span className="block w-3 h-[2px] bg-current rounded-full"></span>
                      <span className="block w-3 h-[2px] bg-current rounded-full"></span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading editor...</div>}>
              <SegmentList 
                segments={editorSegments} 
                selectedIds={selectedIds} 
                onToggleSelect={handleToggleSelect} 
                onUpdateText={updateSegmentText} 
                onUpdateTime={updateSegmentTime}
                onDeleteSegment={deleteSegment}
                onSegmentClick={handleSeekToSegmentStart}
                onShowOptimizeHistory={handleShowOptimizeHistory}
                currentPage={currentPage}
                searchQuery={searchQuery}
                searchCaseSensitive={searchCaseSensitive}
                searchWholeWord={searchWholeWord}
                searchRegexMode={searchRegexMode}
                activeSegmentId={activeCaptionSegmentId}
              />
            </Suspense>
            {videoPreviewUrl && (
              <>
                <div
                  className={`h-2 shrink-0 border-t border-slate-800 bg-slate-900/70 flex items-center justify-center ${isResizingVideoPanel ? 'cursor-row-resize' : 'cursor-ns-resize'}`}
                  onMouseDown={handleStartResizeVideoPanel}
                  role="separator"
                  aria-label="Resize video preview"
                  aria-orientation="horizontal"
                >
                  <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>
                <div className="shrink-0 border-t border-slate-800 bg-slate-950/80 p-2" style={{ height: `${videoPanelHeight}px` }}>
                  <div className="h-full rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                    <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold text-slate-300 truncate">{videoPreviewName || 'Video Preview'}</span>
                      <button
                        type="button"
                        onClick={handleClearVideoPreview}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="relative flex-1 bg-black overflow-hidden">
                      <video
                        ref={videoElementRef}
                        src={videoPreviewUrl}
                        controls
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}
                        onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                        onSeeked={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={() => setVideoCurrentTime(0)}
                      />
                      {activeCaptionLines.length > 0 && (
                        <div className="absolute inset-x-0 bottom-12 px-4 pointer-events-none">
                          <div className="mx-auto max-w-4xl space-y-1 text-center">
                            {activeCaptionLines.map((line, idx) => (
                              <p
                                key={`${idx}-${line.slice(0, 20)}`}
                                className="text-white text-[20px] font-semibold leading-tight whitespace-pre-line"
                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)' }}
                              >
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div
            className={`bg-slate-900 transition-all duration-300 overflow-hidden fixed right-0 top-0 h-full z-20 sm:static sm:h-auto ${
              showQualityDashboard ? 'w-72 border-l border-slate-800 opacity-100' : 'w-0 border-l border-transparent opacity-0 pointer-events-none'
            }`}
          >
            {showQualityDashboard && (
              <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading dashboard...</div>}>
                <AnalyzerPanel data={allStats || ({} as AnalysisResult)} segments={segments} activeFilter={filter} onFilterTrigger={setFilter} safeThreshold={settings.cpsThreshold.safeMax} criticalThreshold={settings.cpsThreshold.warningMax} maxSingleLineWords={settings.maxSingleLineWords} generatedFiles={generatedFiles} onDownloadGenerated={handleDownloadGenerated} onLoadGenerated={handleLoadGenerated} onDeleteGenerated={handleDeleteGenerated} />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-4 sm:p-10 overflow-y-auto pb-24">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* AI Mode (v3.1.0) - Dropdown Selection */}
            <section className="bg-slate-900 border border-slate-800 rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-500">{ICONS.Fix}</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">AI Settings</h3>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="ai-model-select" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Model
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
                    className="absolute right-3 top-9 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    This key is stored locally in your browser (localStorage) and is only sent directly to Google APIs when making requests.
                  </p>
                </div>

              </div>
            </section>

            {/* Subtitle Settings */}
            <section className="bg-slate-900 border border-slate-800 rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-500">{ICONS.Settings}</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">Subtitle Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    CPS Safe Max
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={settings.cpsThreshold.safeMax}
                    onChange={(e) => updateThreshold('safeMax', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    CPS below this value is considered safe.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    CPS Warning Max
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={settings.cpsThreshold.warningMax}
                    onChange={(e) => updateThreshold('warningMax', Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    CPS at or above this value is critical.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Translation Batch Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={settings.translationBatchSize}
                    onChange={(e) => {
                      const next = Math.max(1, Number(e.target.value) || 1);
                      setSettings(prev => ({ ...prev, translationBatchSize: next }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    Segments per AI translate request.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Max Single Line Words
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={settings.maxSingleLineWords}
                    onChange={(e) => {
                      const next = Math.max(1, Number(e.target.value) || 1);
                      setSettings(prev => ({ ...prev, maxSingleLineWords: next }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    Single-line subtitles with at least this many words will be flagged.
                  </p>
                </div>
              </div>
            </section>

            {/* API Usage Dashboard (Session-Based) */}
            <section className="bg-slate-900 border border-slate-800 rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-500">{ICONS.Success}</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">API Usage Dashboard</h3>
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
            </section>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
