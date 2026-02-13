import { SubtitleSegment, AnalysisResult, SubtitleError, Severity, SplitMetadata, HistogramBucket } from '../types';

export interface SplitResult {
  fileName: string;
  segments: SubtitleSegment[];
  metadata?: SplitMetadata;
}

export function parseSRT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0].trim());
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const originalText = lines.slice(2).join('\n').trim();
        
        segments.push({
          id,
          startTime,
          endTime,
          originalText,
          translatedText: '',
          isModified: false,
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

export function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
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
  safeThreshold: number,
  criticalThreshold: number
): { severity: Severity, cps: number, issueList: string[] } {
  const text = segment[textKey] || segment.originalText;
  const cps = calculateCPS(segment, text);
  const issueList: string[] = [];
  let severity: Severity = 'safe';

  if (cps > criticalThreshold) {
    severity = 'critical';
    issueList.push(`CPS vượt quá ngưỡng Critical (> ${criticalThreshold})`);
  } else if (cps >= safeThreshold) {
    severity = 'warning';
    issueList.push(`CPS nằm trong vùng cảnh báo (${safeThreshold}-${criticalThreshold})`);
  }

  const lines = text.split('\n');
  if (lines.length > 2) {
    severity = 'critical';
    issueList.push('Quá 2 dòng');
  }

  if (lines.some(l => l.length > 45)) {
    severity = 'critical';
    issueList.push('Một dòng vượt quá 45 ký tự');
  }

  return { severity, cps, issueList };
}

export function analyzeSegments(
  segments: SubtitleSegment[], 
  textKey: 'originalText' | 'translatedText',
  safeThreshold: number = 25,
  criticalThreshold: number = 40
): AnalysisResult {
  let tooLongLines = 0;
  let tooFastLines = 0;
  let totalCPS = 0;
  let minCPS = Infinity;
  let maxCPS = -Infinity;
  const groups = { safe: 0, warning: 0, critical: 0 };
  const allCPS: number[] = [];

  // Histogram buckets: 0-5, 5-10, ..., 40-45, 45+
  const histogramCounts = new Array(10).fill(0);

  segments.forEach(s => {
    const meta = getSegmentMetadata(s, textKey, safeThreshold, criticalThreshold);
    s.severity = meta.severity;
    s.cps = meta.cps;
    s.issueList = meta.issueList;

    totalCPS += meta.cps;
    allCPS.push(meta.cps);
    if (meta.cps < minCPS) minCPS = meta.cps;
    if (meta.cps > maxCPS) maxCPS = meta.cps;

    if (meta.issueList.some(i => i.includes('dòng'))) tooLongLines++;
    if (meta.cps > criticalThreshold) tooFastLines++;

    groups[meta.severity]++;

    // Bucket calculation
    const bucketIdx = Math.min(Math.floor(meta.cps / 5), 9);
    histogramCounts[bucketIdx]++;
  });

  const totalLines = segments.length;
  if (totalLines === 0) {
    return {
      totalLines: 0,
      tooLongLines: 0,
      tooFastLines: 0,
      avgCPS: 0,
      minCPS: 0,
      maxCPS: 0,
      medianCPS: 0,
      cpsGroups: { safe: 0, warning: 0, critical: 0 },
      cpsHistogram: []
    };
  }

  // Median
  const sortedCPS = [...allCPS].sort((a, b) => a - b);
  const mid = Math.floor(sortedCPS.length / 2);
  const medianCPS = sortedCPS.length % 2 !== 0 ? sortedCPS[mid] : (sortedCPS[mid - 1] + sortedCPS[mid]) / 2;

  // v1.4.0 Histogram Trim Edge Buckets Logic
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
    totalLines,
    tooLongLines,
    tooFastLines,
    avgCPS: totalCPS / totalLines,
    minCPS,
    maxCPS,
    medianCPS,
    cpsGroups: groups,
    cpsHistogram
  };
}

export function performLocalFix(text: string): string {
  let fixed = text.trim();
  fixed = fixed.replace(/\s+/g, ' ');
  if (fixed.length > 40 && !fixed.includes('\n')) {
    const mid = Math.floor(fixed.length / 2);
    const spaceIndex = fixed.indexOf(' ', mid);
    if (spaceIndex !== -1) {
      fixed = fixed.substring(0, spaceIndex) + '\n' + fixed.substring(spaceIndex + 1);
    }
  }
  return fixed;
}

export function generateSRT(segments: SubtitleSegment[], metadata?: SplitMetadata): string {
  let header = '';
  if (metadata) {
    header = `NOTE: Split Range Information\nRange: ${metadata.range}\nStart: ${metadata.start}\nEnd: ${metadata.end}\nSegments: ${metadata.segments}\nDuration: ${metadata.duration}\n\n`;
  }
  
  const content = segments.map((s, index) => {
    const text = s.translatedText || s.originalText;
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

/**
 * Clean base name to ensure we don't nest split prefixes
 */
function getCleanBaseName(baseName: string): string {
  // Remove any existing "[split ...]" prefix pattern
  return baseName.replace(/^\[split [^\]]+\]\s*/i, '');
}

/**
 * Split SRT into multiple parts by Segment Count
 */
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

/**
 * Split SRT into multiple parts by Duration (minutes)
 */
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

/**
 * Split SRT into multiple parts by Manual Timestamp markers
 */
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

/**
 * Split SRT by a specific segment range
 */
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