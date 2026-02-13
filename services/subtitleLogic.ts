
import { SubtitleSegment, AnalysisResult, SubtitleError } from '../types';

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
          errors: []
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

export function analyzeSegments(segments: SubtitleSegment[], textKey: 'originalText' | 'translatedText'): AnalysisResult {
  let tooLongLines = 0;
  let tooFastLines = 0;
  let totalCPS = 0;
  const groups = { safe: 0, warning: 0, danger: 0 };

  segments.forEach(s => {
    const text = s[textKey] || s.originalText;
    const cps = calculateCPS(s, text);
    totalCPS += cps;

    if (text.split('\n').length > 2 || text.length > 50) tooLongLines++;
    if (cps > 25) {
      tooFastLines++;
      groups.danger++;
    } else if (cps >= 20) {
      groups.warning++;
    } else {
      groups.safe++;
    }
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
  // Auto-wrap if too long (very simple logic for local fix)
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
