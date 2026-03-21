import { SubtitleSegment, AnalysisResult, SubtitleError, Severity, SplitMetadata, HistogramBucket, SktProject, TranslationPreset } from '../types';

export interface SplitResult {
  fileName: string;
  segments: SubtitleSegment[];
  metadata?: SplitMetadata;
}

const isChinese = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);

/**
 * Parses a filename to extract base name and the current edited count.
 */
export function parseFileName(fileName: string): { baseName: string, editedCount: number } {
  let name = fileName
    .replace(/\.srt$/i, '')
    .replace(/\.sktproject$/i, '')
    .replace(/\.json$/i, '')
    .trim();
  let editedCount = 0;

  const editedRegex = /^\[Edited(\d*)\]/;
  const match = name.match(editedRegex);

  if (match) {
    const numPart = match[1];
    if (numPart === "") {
      editedCount = 1;
    } else {
      if (!numPart.startsWith('0')) {
        editedCount = parseInt(numPart, 10);
      } else {
        return { baseName: name, editedCount: 0 };
      }
    }
    name = name.substring(match[0].length).trim();
  }

  return { baseName: name, editedCount };
}

export function generateExportFileName(baseName: string, currentCount: number, extension: string = '.srt'): string {
  const nextCount = currentCount + 1;
  const prefix = nextCount === 1 ? '[Edited]' : `[Edited${nextCount}]`;
  return `${prefix}${baseName}${extension}`;
}

export function parseSRT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length >= 2) {
      const id = parseInt(lines[0]);
      const timeMatch = lines[1]?.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch && !isNaN(id)) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        
        const contentLines = lines.slice(2);
        const cnLines: string[] = [];
        const vnLines: string[] = [];

        contentLines.forEach(line => {
          if (isChinese(line)) {
            cnLines.push(line);
          } else {
            vnLines.push(line);
          }
        });

        const originalText = cnLines.length > 0 ? cnLines.join('\n') : null;
        const translatedText = vnLines.length > 0 ? vnLines.join('\n') : null;

        segments.push({
          id,
          startTime,
          endTime,
          originalText,
          translatedText,
          optimizeHistory: [],
          errors: [],
          severity: 'safe',
          cps: 0,
          issueList: []
        });
      }
    }
  });

  return segments;
}

function extractCapCutTextValue(value: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value
      .map(item => extractCapCutTextValue(item, depth + 1))
      .filter((item): item is string => !!item && item.trim().length > 0);
    if (parts.length > 0) return parts.join('\n');
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const preferredKeys = ['text', 'content', 'value', 'name', 'caption', 'subtitle', 'title'];

    for (const key of preferredKeys) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v;
      if (Array.isArray(v)) {
        const arrText = extractCapCutTextValue(v, depth + 1);
        if (arrText) return arrText;
      }
      if (v && typeof v === 'object') {
        const nested = extractCapCutTextValue(v, depth + 1);
        if (nested) return nested;
      }
    }

    for (const v of Object.values(obj)) {
      const nested = extractCapCutTextValue(v, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

function cleanCapCutText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  let text = extractCapCutTextValue(raw) ?? String(raw);
  const trimmedCandidate = text.trim();
  if (
    (trimmedCandidate.startsWith('{') && trimmedCandidate.endsWith('}')) ||
    (trimmedCandidate.startsWith('[') && trimmedCandidate.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmedCandidate);
      const extracted = extractCapCutTextValue(parsed);
      if (extracted) text = extracted;
    } catch {
      // ignore JSON parse errors and fall back to string content
    }
  }
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  text = text
    .split('\n')
    .map(line => {
      let cleaned = line.trim();
      if (cleaned.startsWith('[') && cleaned.endsWith(']') && cleaned.length >= 2) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned;
    })
    .filter(line => line.length > 0)
    .join('\n');

  let trimmed = text.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length >= 2) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getCapCutTimerangeSeconds(timerange?: { start?: number; duration?: number } | null): { start: number; end: number } | null {
  if (!timerange) return null;
  const startUs = typeof timerange.start === 'number' ? timerange.start : null;
  const durUs = typeof timerange.duration === 'number' ? timerange.duration : null;
  if (startUs === null || durUs === null) return null;
  const start = startUs / 1_000_000;
  const end = (startUs + durUs) / 1_000_000;
  return { start, end };
}

function containsDisallowedOriginalLetters(text: string): boolean {
  for (const ch of text) {
    if (!/\p{L}/u.test(ch)) continue;
    if (/\p{Script=Han}/u.test(ch)) continue;
    if (/[A-Za-z]/.test(ch)) continue;
    return true;
  }
  return false;
}

function containsNonLatinLetters(text: string): boolean {
  for (const ch of text) {
    if (/\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch)) return true;
  }
  return false;
}

const ISSUE_ORIGINAL_LANG = 'Original contains non-Chinese characters';
const ISSUE_TRANSLATION_LANG = 'Translation contains non-Vietnamese characters';
const ISSUE_SINGLE_LINE_LONG = 'Line has too many words';

function countWords(text: string): number {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0).length;
}

function getLanguageIssues(
  textKey: 'originalText' | 'translatedText',
  text: string
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (textKey === 'originalText' && containsDisallowedOriginalLetters(trimmed)) {
    return [ISSUE_ORIGINAL_LANG];
  }
  if (textKey === 'translatedText' && containsNonLatinLetters(trimmed)) {
    return [ISSUE_TRANSLATION_LANG];
  }
  return [];
}

/**
 * Parses CapCut draft_content.json into SubtitleSegment[].
 */
export function parseCapCutDraft(content: string): { segments: SubtitleSegment[], title: string } {
  const json = JSON.parse(content);
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid CapCut draft_content.json format.');
  }

  const hasTracks = Array.isArray((json as any).tracks);
  const hasMaterials = Array.isArray((json as any).materials?.texts);
  if (!hasTracks && !hasMaterials) {
    throw new Error('Invalid CapCut draft_content.json format.');
  }
  const materials = Array.isArray(json.materials?.texts) ? json.materials.texts : [];
  const materialMap = new Map<string, string>();

  materials.forEach((m: any) => {
    const id = m?.id;
    if (!id) return;
    const raw = m.content ?? m.text ?? m.name ?? '';
    const cleaned = cleanCapCutText(raw);
    materialMap.set(id, cleaned);
  });

  const tracks = Array.isArray(json.tracks) ? json.tracks : [];
  const textTracks = tracks.filter((t: any) => ['text', 'subtitle', 'captions'].includes(String(t?.type)));

  const collected: { start: number; end: number; text: string }[] = [];

  textTracks.forEach((track: any) => {
    const segments = Array.isArray(track.segments) ? track.segments : [];
    segments.forEach((seg: any) => {
      const materialId = seg?.material_id;
      const rawText = materialId ? materialMap.get(materialId) : '';
      const text = cleanCapCutText(rawText);
      if (!text) return;
      const range = getCapCutTimerangeSeconds(seg?.target_timerange || seg?.source_timerange);
      if (!range) return;
      collected.push({ start: range.start, end: range.end, text });
    });
  });

  if (collected.length === 0) {
    throw new Error('No CapCut text tracks found.');
  }

  collected.sort((a, b) => a.start - b.start);

  const segments: SubtitleSegment[] = collected.map((item, index) => ({
    id: index + 1,
    startTime: secondsToTime(item.start),
    endTime: secondsToTime(item.end),
    originalText: item.text,
    translatedText: null,
    optimizeHistory: [],
    errors: [],
    severity: 'safe',
    cps: 0,
    issueList: []
  }));

  return { segments, title: 'CapCut Draft' };
}

/**
 * Parses a .sktproject JSON content into SubtitleSegment[].
 */
export function parseSktProject(content: string): { segments: SubtitleSegment[], preset: TranslationPreset | null, title: string } {
  const json: SktProject = JSON.parse(content);
  if (json.version !== "1.0") throw new Error("Unsupported project version");

  const segments: SubtitleSegment[] = json.segments.map(s => ({
    id: s.id,
    startTime: s.start,
    endTime: s.end,
    originalText: s.original || null,
    translatedText: s.translated || null,
    optimizeHistory: Array.isArray(s.optimize_history)
      ? s.optimize_history
          .map((h: any) => {
            if (typeof h === 'string') return h.trim();
            if (h && typeof h === 'object' && typeof h.after === 'string') return h.after.trim();
            return '';
          })
          .filter((h: string) => h.length > 0)
      : [],
    errors: [],
    severity: 'safe',
    cps: 0,
    issueList: []
  }));

  // Ensure preset is either a valid object or null
  const preset = (json.preset && typeof json.preset === 'object' && Object.keys(json.preset).length > 0) 
    ? {
        reference: json.preset.reference || { title_or_summary: "" },
        genres: Array.isArray(json.preset.genres) ? json.preset.genres : [],
        term_replacements: Array.isArray(json.preset.term_replacements)
          ? json.preset.term_replacements
              .filter((t: any) => t && typeof t.find === 'string' && typeof t.replace_with === 'string')
              .map((t: any, i: number) => ({
                id: typeof t.id === 'number' && Number.isFinite(t.id) ? t.id : i + 1,
                find: t.find,
                replace_with: t.replace_with
              }))
          : [],
        term_replace_options: {
          case_sensitive: !!json.preset.term_replace_options?.case_sensitive,
          whole_word: !!json.preset.term_replace_options?.whole_word,
          regex: !!json.preset.term_replace_options?.regex
        },
        humor_level: typeof json.preset.humor_level === 'number' ? json.preset.humor_level : 0
      }
    : null;

  return { segments, preset, title: json.original_title };
}

/**
 * Generates .sktproject JSON string.
 */
export function generateSktProject(segments: SubtitleSegment[], title: string, preset: TranslationPreset | null, createdAt?: string): string {
  const project: SktProject = {
    version: "1.0",
    original_title: title,
    created_at: createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    preset: preset,
    segments: segments.map(s => ({
      id: s.id,
      start: s.startTime,
      end: s.endTime,
      original: s.originalText || "",
      translated: s.translatedText || "",
      optimize_history: s.optimizeHistory && s.optimizeHistory.length > 0 ? s.optimizeHistory : undefined
    }))
  };
  return JSON.stringify(project, null, 2);
}

export function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

export function secondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export function formatDurationHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function calculateCPS(segment: SubtitleSegment, text: string): number {
  const start = timeToSeconds(segment.startTime);
  const end = timeToSeconds(segment.endTime);
  const duration = Math.max(end - start, 0.1);
  return text.length / duration;
}

export function getSegmentMetadata(
  segment: SubtitleSegment, 
  textKey: 'originalText' | 'translatedText',
  cpsThreshold: { safeMax: number; warningMax: number },
  maxSingleLineWords: number
): { severity: Severity, cps: number, issueList: string[] } {
  const text = (segment[textKey] || segment.originalText || segment.translatedText || "").trim();
  const langSource = (segment[textKey] || '').trim();
  const cps = calculateCPS(segment, text);
  const issueList: string[] = [];
  let severity: Severity = 'safe';

  if (cps > cpsThreshold.warningMax) {
    severity = 'critical';
    issueList.push(`CPS exceeds critical threshold (> ${cpsThreshold.warningMax})`);
  } else if (cps >= cpsThreshold.safeMax) {
    severity = 'warning';
    issueList.push(`CPS is in the warning range (${cpsThreshold.safeMax}-${cpsThreshold.warningMax})`);
  } else {
    severity = 'safe';
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 2) {
    issueList.push('Subtitle has more than 2 lines');
  }
  if (maxSingleLineWords > 0) {
    const lineWordCounts = lines.map(line => countWords(line));
    const maxLineWords = lineWordCounts.length > 0 ? Math.max(...lineWordCounts) : 0;
    if (maxLineWords > maxSingleLineWords) {
      issueList.push(`${ISSUE_SINGLE_LINE_LONG} (${maxLineWords} words, > ${maxSingleLineWords})`);
      if (severity === 'safe') {
        severity = 'warning';
      }
    }
  }

  if (langSource) {
    const langIssues = getLanguageIssues(textKey, langSource);
    if (langIssues.length > 0) {
      issueList.push(...langIssues);
    }
  }

  return { severity, cps, issueList };
}

export function analyzeSegments(
  segments: SubtitleSegment[], 
  textKey: 'originalText' | 'translatedText',
  cpsThreshold: { safeMax: number; warningMax: number },
  maxSingleLineWords: number
): { stats: AnalysisResult, enrichedSegments: SubtitleSegment[] } {
  let tooLongLines = 0;
  let singleLineLongLines = 0;
  let tooFastLines = 0;
  let timelineOverlapLines = 0;
  let originalLangIssueLines = 0;
  let translatedLangIssueLines = 0;
  let totalCPS = 0;
  let minCPS = Infinity;
  let maxCPS = -Infinity;
  const groups = { safe: 0, warning: 0, critical: 0 };
  const allCPS: number[] = [];

  const histogramCounts = new Array(10).fill(0);

  const enrichedSegments = segments.map(s => {
    const meta = getSegmentMetadata(s, textKey, cpsThreshold, maxSingleLineWords);
    let mergedIssueList = [...meta.issueList];
    let mergedSeverity: Severity = meta.severity;

    if (textKey === 'translatedText') {
      const originalIssues = getLanguageIssues('originalText', s.originalText || '');
      if (originalIssues.length > 0) {
        for (const issue of originalIssues) {
          if (!mergedIssueList.includes(issue)) mergedIssueList.push(issue);
        }
      }
    }
    
    const enriched = {
      ...s,
      severity: mergedSeverity,
      cps: meta.cps,
      issueList: mergedIssueList
    };

    totalCPS += meta.cps;
    allCPS.push(meta.cps);
    if (meta.cps < minCPS) minCPS = meta.cps;
    if (meta.cps > maxCPS) maxCPS = meta.cps;

    if (meta.issueList.some(i => i.toLowerCase().includes('subtitle has more than 2 lines'.toLowerCase()))) tooLongLines++;
    if (meta.issueList.some(i => i.toLowerCase().includes(ISSUE_SINGLE_LINE_LONG.toLowerCase()))) singleLineLongLines++;
    if (meta.severity === 'critical') tooFastLines++;
    if (mergedIssueList.includes(ISSUE_ORIGINAL_LANG)) originalLangIssueLines++;
    if (mergedIssueList.includes(ISSUE_TRANSLATION_LANG)) translatedLangIssueLines++;

    groups[meta.severity]++;

    const bucketIdx = Math.min(Math.floor(meta.cps / 5), 9);
    histogramCounts[bucketIdx]++;

    return enriched;
  });

  for (let i = 1; i < enrichedSegments.length; i++) {
    const prev = enrichedSegments[i - 1];
    const current = enrichedSegments[i];
    const prevEnd = timeToSeconds(prev.endTime);
    const currentStart = timeToSeconds(current.startTime);

    if (prevEnd > currentStart) {
      timelineOverlapLines++;
      prev.issueList = [...prev.issueList, `Timeline overlap with segment #${current.id}`];
      current.issueList = [...current.issueList, `Timeline overlap with segment #${prev.id}`];
    }
  }

  const totalLines = segments.length;
  if (totalLines === 0) {
    return {
      stats: {
        totalLines: 0,
        tooLongLines: 0,
        singleLineLongLines: 0,
        tooFastLines: 0,
        timelineOverlapLines: 0,
        originalLangIssueLines: 0,
        translatedLangIssueLines: 0,
        avgCPS: 0,
        minCPS: 0,
        maxCPS: 0,
        medianCPS: 0,
        cpsGroups: { safe: 0, warning: 0, critical: 0 },
        cpsHistogram: []
      },
      enrichedSegments: []
    };
  }

  const sortedCPS = [...allCPS].sort((a, b) => a - b);
  const mid = Math.floor(sortedCPS.length / 2);
  const medianCPS = sortedCPS.length % 2 !== 0 ? sortedCPS[mid] : (sortedCPS[mid - 1] + sortedCPS[mid]) / 2;

  let firstNonEmpty = histogramCounts.findIndex(count => count > 0);
  let lastNonEmpty = -1;
  for (let i = histogramCounts.length - 1; i >= 0; i--) {
    if (histogramCounts[i] > 0) {
      lastNonEmpty = i;
      break;
    }
  }

  const cpsHistogram: HistogramBucket[] = [];
  if (firstNonEmpty !== -1) {
    for (let i = firstNonEmpty; i <= lastNonEmpty; i++) {
      const count = histogramCounts[i];
      const min = i * 5;
      const max = i === 9 ? Infinity : (i + 1) * 5;
      const range = i === 9 ? '45+' : `${min}–${max}`;
      cpsHistogram.push({
        range,
        min,
        max,
        count,
        percentage: Math.round((count / totalLines) * 100)
      });
    }
  }

  return {
      stats: {
        totalLines,
        tooLongLines,
        singleLineLongLines,
        tooFastLines,
        timelineOverlapLines,
        originalLangIssueLines,
        translatedLangIssueLines,
      avgCPS: totalCPS / totalLines,
      minCPS,
      maxCPS,
      medianCPS,
      cpsGroups: groups,
      cpsHistogram
    },
    enrichedSegments
  };
}

export function performLocalFix(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const lines = normalized
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .filter(line => line.length > 0);
  return lines.join('\n');
}

export function generateSRT(
  segments: SubtitleSegment[],
  mode: 'original' | 'translated' = 'translated',
  metadata?: SplitMetadata,
  options?: { flattenText?: boolean }
): string {
  let header = '';
  if (metadata) {
    header = `NOTE: Split Range Information\nRange: ${metadata.range}\nStart: ${metadata.start}\nEnd: ${metadata.end}\nSegments: ${metadata.segments}\nDuration: ${metadata.duration}\n\n`;
  }
  
  const content = segments.map((s, index) => {
    const rawText = mode === 'translated' ? (s.translatedText || "") : (s.originalText || "");
    const text = options?.flattenText
      ? rawText
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .join(' ')
      : rawText;
    return `${index + 1}\n${s.startTime} --> ${s.endTime}\n${text}\n`;
  }).join('\n');

  return header + content;
}

function createMetadata(segments: SubtitleSegment[], range: string): SplitMetadata {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const dur = timeToSeconds(last.endTime) - timeToSeconds(first.startTime);
  
  return {
    range,
    start: first.startTime.split(',')[0],
    end: last.endTime.split(',')[0],
    segments: segments.length,
    duration: formatDurationHMS(dur)
  };
}

function getCleanBaseName(baseName: string): string {
  return baseName.replace(/^\[split [^\]]+\]\s*/i, '');
}

export function splitByCount(segments: SubtitleSegment[], countPerFile: number, baseName: string, includeMetadata: boolean = true): SplitResult[] {
  const results: SplitResult[] = [];
  const cleanBase = getCleanBaseName(baseName);
  
  for (let i = 0; i < segments.length; i += countPerFile) {
    const batch = segments.slice(i, i + countPerFile);
    const startIdx = i + 1;
    const endIdx = Math.min(i + countPerFile, segments.length);
    
    results.push({
      fileName: `[split ${startIdx} to ${endIdx}] ${cleanBase}`,
      segments: batch,
      metadata: includeMetadata ? createMetadata(batch, `${startIdx} → ${endIdx}`) : undefined
    });
  }
  return results;
}

export function splitByDuration(segments: SubtitleSegment[], minutes: number, baseName: string, includeMetadata: boolean = true): SplitResult[] {
  const results: SplitResult[] = [];
  const durationSec = minutes * 60;
  const cleanBase = getCleanBaseName(baseName);
  
  let currentBatch: SubtitleSegment[] = [];
  let currentLimit = durationSec;
  let batchStartIndex = 1;

  segments.forEach((seg, idx) => {
    const startTime = timeToSeconds(seg.startTime);
    if (startTime >= currentLimit && currentBatch.length > 0) {
      const startMin = Math.floor((currentLimit - durationSec) / 60);
      const endMin = Math.floor(currentLimit / 60);
      const prefix = `[split ${startMin.toString().padStart(2, '0')}-${endMin.toString().padStart(2, '0')}min]`;
      
      results.push({
        fileName: `${prefix} ${cleanBase}`,
        segments: [...currentBatch],
        metadata: includeMetadata ? createMetadata(currentBatch, `${batchStartIndex} → ${idx}`) : undefined
      });
      currentBatch = [];
      batchStartIndex = idx + 1;
      while (currentLimit <= startTime) {
        currentLimit += durationSec;
      }
    }
    currentBatch.push(seg);
  });

  if (currentBatch.length > 0) {
    const startMin = Math.floor((currentLimit - durationSec) / 60);
    const lastSegSeconds = timeToSeconds(currentBatch[currentBatch.length - 1].endTime);
    const endMin = Math.ceil(lastSegSeconds / 60);
    const prefix = `[split ${startMin.toString().padStart(2, '0')}-${endMin.toString().padStart(2, '0')}min]`;

    results.push({
      fileName: `${prefix} ${cleanBase}`,
      segments: currentBatch,
      metadata: includeMetadata ? createMetadata(currentBatch, `${batchStartIndex} → ${segments.length}`) : undefined
    });
  }

  return results;
}

export function splitByManual(segments: SubtitleSegment[], markers: string[], baseName: string, includeMetadata: boolean = true): SplitResult[] {
  const results: SplitResult[] = [];
  const cleanBase = getCleanBaseName(baseName);
  
  const sortedMarkers = markers
    .map(m => ({ original: m, seconds: timeToSeconds(m.trim().includes(',') ? m.trim() : m.trim() + ',000') }))
    .sort((a, b) => a.seconds - b.seconds);

  let currentBatch: SubtitleSegment[] = [];
  let markerIdx = 0;
  let batchStartIndex = 1;

  segments.forEach((seg, idx) => {
    const startTime = timeToSeconds(seg.startTime);
    
    while (markerIdx < sortedMarkers.length && startTime >= sortedMarkers[markerIdx].seconds) {
      if (currentBatch.length > 0) {
        const startT = currentBatch[0].startTime.split(',')[0];
        const endT = currentBatch[currentBatch.length - 1].endTime.split(',')[0];
        const prefix = `[split ${startT}-${endT}]`;

        results.push({
          fileName: `${prefix} ${cleanBase}`,
          segments: [...currentBatch],
          metadata: includeMetadata ? createMetadata(currentBatch, `${batchStartIndex} → ${idx}`) : undefined
        });
        currentBatch = [];
        batchStartIndex = idx + 1;
      }
      markerIdx++;
    }
    currentBatch.push(seg);
  });

  if (currentBatch.length > 0) {
    const startT = currentBatch[0].startTime.split(',')[0];
    const endT = currentBatch[currentBatch.length - 1].endTime.split(',')[0];
    const prefix = `[split ${startT}-${endT}]`;

    results.push({
      fileName: `${prefix} ${cleanBase}`,
      segments: currentBatch,
      metadata: includeMetadata ? createMetadata(currentBatch, `${batchStartIndex} → ${segments.length}`) : undefined
    });
  }

  return results;
}

export function splitByRange(segments: SubtitleSegment[], startIdx: number, endIdx: number, baseName: string, includeMetadata: boolean = true): SplitResult[] {
  const realStart = Math.max(0, startIdx - 1);
  const realEnd = Math.min(segments.length, endIdx);
  const cleanBase = getCleanBaseName(baseName);
  const rangeBatch = segments.slice(realStart, realEnd);
  
  return [{
    fileName: `[split range ${startIdx} to ${endIdx}] ${cleanBase}`,
    segments: rangeBatch,
    metadata: includeMetadata ? createMetadata(rangeBatch, `${startIdx} → ${endIdx}`) : undefined
  }];
}
