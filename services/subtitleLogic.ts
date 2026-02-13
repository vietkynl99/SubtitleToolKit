import { SubtitleSegment, AnalysisResult, SubtitleError, Severity } from '../types';

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
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

export function calculateCPS(segment: SubtitleSegment, text: string): number {
  const start = timeToSeconds(segment.startTime);
  const end = timeToSeconds(segment.endTime);
  const duration = Math.max(end - start, 0.1);
  return text.length / duration;
}

export function getSegmentMetadata(segment: SubtitleSegment, textKey: 'originalText' | 'translatedText'): { severity: Severity, cps: number, issueList: string[] } {
  const text = segment[textKey] || segment.originalText;
  const cps = calculateCPS(segment, text);
  const issueList: string[] = [];
  let severity: Severity = 'safe';

  if (cps > 25) {
    severity = 'critical';
    issueList.push('CPS quá nhanh (> 25)');
  } else if (cps >= 20) {
    severity = 'warning';
    issueList.push('CPS cảnh báo (20-25)');
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

export function analyzeSegments(segments: SubtitleSegment[], textKey: 'originalText' | 'translatedText'): AnalysisResult {
  let tooLongLines = 0;
  let tooFastLines = 0;
  let totalCPS = 0;
  const groups = { safe: 0, warning: 0, critical: 0 };

  segments.forEach(s => {
    const meta = getSegmentMetadata(s, textKey);
    s.severity = meta.severity;
    s.cps = meta.cps;
    s.issueList = meta.issueList;

    totalCPS += meta.cps;

    if (meta.issueList.some(i => i.includes('dòng'))) tooLongLines++;
    if (meta.cps > 25) tooFastLines++;

    groups[meta.severity]++;
  });

  return {
    totalLines: segments.length,
    tooLongLines,
    tooFastLines,
    avgCPS: segments.length > 0 ? totalCPS / segments.length : 0,
    cpsGroups: groups
  };
}

export function performLocalFix(text: string): string {
  let fixed = text.trim();
  // Remove multiple spaces
  fixed = fixed.replace(/\s+/g, ' ');
  // Auto-wrap if too long
  if (fixed.length > 40 && !fixed.includes('\n')) {
    const mid = Math.floor(fixed.length / 2);
    const spaceIndex = fixed.indexOf(' ', mid);
    if (spaceIndex !== -1) {
      fixed = fixed.substring(0, spaceIndex) + '\n' + fixed.substring(spaceIndex + 1);
    }
  }
  return fixed;
}

export function generateSRT(segments: SubtitleSegment[]): string {
  return segments.map(s => {
    const text = s.translatedText || s.originalText;
    return `${s.id}\n${s.startTime} --> ${s.endTime}\n${text}\n`;
  }).join('\n');
}