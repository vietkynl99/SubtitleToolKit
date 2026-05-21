import { TranslationPreset } from "../types";

/**
 * Normalize AI text output - handle line endings
 */
export function normalizeAiText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
}

/**
 * Count words in a text string
 */
export function countWords(text: string): number {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return 0;
  return normalized.split(' ').length;
}

/**
 * Split text into two lines if it exceeds maxWords per line
 */
export function splitToTwoLinesIfLong(text: string, maxWords: number): string {
  if (!text) return text;
  const normalized = text.replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return text;

  const strongPunct = /[.!?…。！？]+$/;
  const softPunct = /[,;:，、]+$/;
  const minWordsPerLine = Math.min(2, maxWords);

  const pickSplitIndex = (words: string[], max: number): number => {
    const minIdx = minWordsPerLine;
    const maxIdx = words.length - minWordsPerLine;
    const target = Math.ceil(words.length / 2);
    const window = Math.max(2, Math.floor(words.length * 0.2));
    let bestIdx = Math.max(minIdx, Math.min(target, maxIdx));
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = minIdx; i <= maxIdx; i++) {
      const w = words[i - 1];
      const isStrong = strongPunct.test(w);
      const isSoft = softPunct.test(w);
      const punctWeight = isStrong ? 0 : isSoft ? 1 : 2;

      const line1 = i;
      const line2 = words.length - i;
      const dist = Math.abs(i - target);
      const imbalance = Math.abs(line1 - line2);
      const maxLine = Math.max(line1, line2);
      const overMax = Math.max(0, maxLine - max);

      const nearMiddle = dist <= window;
      const farFromMiddlePenalty = nearMiddle ? 0 : 1000;
      const score = (farFromMiddlePenalty) + (punctWeight * 100) + (dist * 2) + (imbalance * 5) + (overMax * 10);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  const splitLine = (line: string): string[] => {
    const words = line.split(' ').filter(Boolean);
    if (words.length <= maxWords) return [line];

    // Prefer 2 lines even if a line exceeds maxWords.
    let splitAt = pickSplitIndex(words, maxWords);
    if (splitAt < minWordsPerLine) splitAt = minWordsPerLine;
    if ((words.length - splitAt) < minWordsPerLine) splitAt = Math.max(minWordsPerLine, words.length - minWordsPerLine);

    let first = words.slice(0, splitAt).join(' ');
    let second = words.slice(splitAt).join(' ');

    // If the second line is too short, rebalance while keeping 2 lines.
    if (countWords(second) < minWordsPerLine) {
      const firstWords = first.split(' ').filter(Boolean);
      const secondWords = second.split(' ').filter(Boolean);
      while (secondWords.length < minWordsPerLine && firstWords.length > minWordsPerLine) {
        secondWords.unshift(firstWords.pop() as string);
      }
      first = firstWords.join(' ');
      second = secondWords.join(' ');
    }

    return [first, second];
  };

  let lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 2) {
    const line1Words = countWords(lines[0]);
    const line2Words = countWords(lines[1]);
    const totalWords = line1Words + line2Words;
    if (totalWords <= maxWords * 2 && (line1Words > maxWords || line2Words > maxWords)) {
      const merged = `${lines[0]} ${lines[1]}`.replace(/\s+/g, ' ').trim();
      const rebalanced = splitLine(merged);
      if (rebalanced.length === 2) return rebalanced.join('\n');
    }
  }
  if (lines.length > 2) {
    lines = [lines.join(' ')];
  }
  const finalLines = lines.flatMap(splitLine);
  return finalLines.join('\n');
}

/**
 * Collapse multi-line text to single line if total words is short enough
 */
export function collapseToSingleLineIfShort(text: string, maxWords: number = 10): string {
  if (!text.includes('\n')) return text;
  const singleLine = text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (countWords(singleLine) <= maxWords) return singleLine;
  return text;
}

/**
 * Get humor style rules based on humor level (0-10)
 */
export function getHumorRule(humorLevel: number): string {
  if (humorLevel <= 2) {
    return `Neutral narration. Translate faithfully, no sarcasm or exaggeration.`;
  }
  if (humorLevel <= 4) {
    return `Natural conversational narration. Sound like natural spoken Vietnamese. Very mild humor allowed.`;
  }
  if (humorLevel <= 6) {
    return `Playful narration. Prefer lively spoken Vietnamese. Mild humor, expressive wording allowed.`;
  }
  if (humorLevel <= 8) {
    return `Energetic recap-style narration. Expressive and dynamic phrasing, light sarcasm or exaggeration allowed. Make subtitles feel entertaining and vivid.`;
  }
  return `
Chaotic comedic narrator mode (MAX LEVEL).
- **PERSONA**: You are a "Witty Gen Z Sarcastic Storyteller". You use modern Vietnamese slang (e.g., "ảo thật đấy", "cạn lời", "bay màu") combined with exaggerated, poetic metaphors ("bay bổng") to make the story vivid.
- **VOICE**: Sarcastic, over-the-top, and entertaining. Actively inject humor through teasing and mockery.
- **CONSISTENCY**: You must maintain a steady voice across the entire story. Do not be serious in one batch and funny in another.
- **PRONOUNS**: Stick to established relationships:
  * Enemies/Villains: "Mày - Tao" or "Ngươi - Ta".
  * Master/Disciple or Formal: "Ta - Ngươi" or "Tiền bối - Hậu bối".
  * Romantic/Close: "Anh - Em" or "Chàng - Thiếp" if appropriate.
  * Casual: "Tui - Ông/Bà" or "Cậu - Tớ".
- **STRUCTURE**: Rewrite into shorter, punchier Vietnamese. Keep a strict 1-to-1 mapping. Do NOT merge IDs.
- **STYLE**: Feel like a fast, high-energy recap. Use metaphors and colorful language to make it "bay bổng" but keep it grounded in the original meaning.
`;
}

/**
 * Get character name normalization rules from preset
 */
export function getCharacterRules(preset: TranslationPreset | null): string {
  if (!preset?.character_names || preset.character_names.length === 0) return "";
  return `
Character name normalization:
Canonical characters (Chinese -> Vietnamese):
${preset.character_names.map(c => `- ${c.cn} → ${c.vn}`).join('\n')}

Important rules:
- Names in the source may be inconsistent (similar characters, pronunciation, or spelling).
- If a name is identical, visually similar, or phonetically similar to a known character, treat it as the SAME person.
- ALWAYS use the provided Vietnamese name.
- NEVER create alternative name variants.
- Do NOT create new characters unless clearly different.
`;
}

/**
 * Build the translation prompt with all rules and context
 */
export function buildTranslationPrompt(
  batch: SubtitleSegment[],
  contextBefore: string[],
  contextAfter: string[],
  preset: TranslationPreset | null,
  maxSingleLineWords: number,
  autoSplitLongLines: boolean
): { systemPrompt: string; userPrompt: string; responseSchema: object } {
  const humorLevel = preset?.humor_level ?? 0;
  const humorRule = getHumorRule(humorLevel);

  const styleBlock = preset
    ? `
Genres: ${preset.genres.join(", ")}

Narration style:
${humorRule}
`
    : `
Narration intensity level: 0/10
Neutral Vietnamese subtitle narration.
`;

  const storyContext = preset?.reference?.title_or_summary
    ? `Story context: ${preset.reference.title_or_summary}`
    : "";
  const characterRules = getCharacterRules(preset);
  const hasCharacterRules = Boolean(characterRules && characterRules.trim().length);

  const neighborContext =
    contextBefore.length || contextAfter.length
      ? `
Neighbor subtitles (reference only):
Prev: ${JSON.stringify(contextBefore)}
Next: ${JSON.stringify(contextAfter)}
`
      : "";

  const systemPrompt = `You are a professional subtitle translator. Translate Chinese subtitles into natural Vietnamese.
Always respond with valid JSON matching the requested schema.`;

  const userPrompt = `
OUTPUT MUST BE 100% VIETNAMESE. NO Chinese characters allowed in the output.

Translate Chinese subtitles into natural Vietnamese.
Output: JSON array [{"id": number, "text": string}] - one object per input, same order, no omissions.
**STRICT RULE: 1-to-1 mapping required. Do NOT merge the content of multiple input IDs into a single output ID. Do NOT repeat the same text for different IDs.**

${styleBlock}
${storyContext}
${hasCharacterRules ? characterRules : ""}
${neighborContext}

Rules:
1. Preserve core meaning. Do not invent story events. Tone adaptation allowed.
2. Length: keep all meaningful content - only remove filler/repeated words. Very short source (<=6 Chinese chars) -> keep output brief (2-5 Vietnamese words). Longer lines -> translate fully, do not compress.
${autoSplitLongLines
  ? `Use "\\n" ONLY when the subtitle exceeds ${maxSingleLineWords} words and needs a visual display break - NOT as a clause separator for short subtitles.`
  : "Line breaks optional."}
3. Punctuation: Chinese subtitles often lack punctuation. For a subtitle with multiple short clauses, separate them with a comma within the same line - do NOT use "\\n" as a clause separator. Only add punctuation that is grammatically necessary; do not add expressive punctuation not implied by the source.
4. Names: Sino-Vietnamese (Hán-Việt) transcription (e.g. 张凤华 -> Trương Phượng Hoa). Do NOT use Pinyin ("Zhang", "Wang", "Li" are WRONG).${hasCharacterRules ? " Use character rules if provided." : " Ensure consistent Hán-Việt transcription for names across all segments."}
5. Each subtitle is independent; neighbor context for reference only. **NEVER combine the meaning of adjacent subtitles into one.**
6. Style priority: follow narration style above if meaning is preserved.
7. **NO REPETITION: Do not use the exact same translation for different IDs unless the source text is identical.**

REMINDER: Output text must be 100% Vietnamese. Any Chinese character in output is a critical error.

Subtitle data:
${JSON.stringify(batch.map(s => ({ id: s.id, text: s.originalText })))}
`;

  const responseSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "integer" },
        text: { type: "string" }
      },
      required: ["id", "text"]
    }
  };

  return { systemPrompt, userPrompt, responseSchema };
}

/**
 * Build the optimization prompt for AI fix
 */
export function buildOptimizePrompt(
  segments: SubtitleSegment[],
  preset: TranslationPreset | null
): { systemPrompt: string; userPrompt: string; responseSchema: object } {
  const humorLevel = preset?.humor_level ?? 0;
  const humorRule = getHumorRule(humorLevel);

  const styleBlock = preset
    ? `
Genres: ${preset.genres.join(", ")}

Narration style:
${humorRule}
`
    : `
Narration intensity level: 0/10
Neutral Vietnamese subtitle narration.
`;

  const storyContext = preset?.reference?.title_or_summary
    ? `Story context: ${preset.reference.title_or_summary}`
    : "";
  const characterRules = getCharacterRules(preset);
  const hasCharacterRules = Boolean(characterRules && characterRules.trim().length);

  const payload = segments.map((s) => {
    const duration = Math.max(timeToSeconds(s.endTime) - timeToSeconds(s.startTime), 0.1);
    const currentText = s.translatedText || "";
    const currentCps = currentText.length / duration;

    return {
      id: s.id,
      cn: s.originalText || "",
      vn: currentText,
      duration,
      currentCps,
    };
  });

  const systemPrompt = "You are a subtitle optimization assistant. Optimize Vietnamese subtitles for readability and CPS.";
  const userPrompt = `
CRITICAL: OUTPUT MUST BE 100% VIETNAMESE. Any Chinese character in the output is a hard failure.

Fix and optimize Vietnamese subtitles. Translate any remaining Chinese to Vietnamese.
Output: JSON array [{"id": number, "fixedText": string}]

${styleBlock}
${storyContext}
${hasCharacterRules ? characterRules : ""}

Input fields:
- cn: The original Chinese source - translate FROM this; this defines the scope of this segment
- vn: Previous Vietnamese draft - use only for established terminology/proper nouns; do NOT copy its content or sentence structure

Rules:
1. Translate ALL Chinese characters in vn using cn as reference.
2. Names/proper nouns: Sino-Vietnamese (Hán-Việt) transcription (e.g. 张凤华 -> Trương Phượng Hoa, 问天宗 -> Vấn Thiên Tông). Do NOT use Pinyin ("Zhang", "Wang" are WRONG).${hasCharacterRules ? " Use character rules if provided." : ""}
3. Organizations/titles: translate meaningfully using Hán-Việt.
4. Each segment is independent. Do NOT merge or split segments.
5. Translate from cn. Reference vn only for established proper nouns or terminology already translated in vn. Do NOT reproduce vn content that exceeds what cn says.
6. Punctuation: add natural punctuation only where grammatically necessary. Do not add expressive punctuation not implied by the source.
7. Output length based on cn length:
   - cn <=4 chars: this is a fragment segment - output ONLY the direct translation of cn (a word, name, or phrase). Do NOT append vn content after it.
   - cn 5-8 chars: aim for a concise output proportional to cn; include vn content only if it is clearly required to complete the meaning of cn
   - cn >8 chars: translate fully; compress only if the FOCUS above instructs it
   - Do NOT use vn length as a benchmark.

REMINDER: Every fixedText must be pure Vietnamese Latin script. Zero Chinese characters allowed.

Segments:
${JSON.stringify(payload)}
`;

  const responseSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "integer" },
        fixedText: { type: "string" }
      },
      required: ["id", "fixedText"]
    }
  };

  return { systemPrompt, userPrompt, responseSchema };
}

// Import timeToSeconds for buildOptimizePrompt
import { SubtitleSegment } from "../types";
import { timeToSeconds } from "./subtitleLogic";

/**
 * Genre taxonomy for style analysis
 */
export const GENRE_TAXONOMY = [
  "Tu tiên", "Tiên hiệp", "Huyền huyễn", "Hệ thống", "Xuyên không",
  "Trọng sinh", "Dị giới", "Dị năng", "Thần thoại", "Quỷ dị",
  "Huyền nghi", "Mạt thế", "Đô thị", "Tổng tài", "Thương chiến",
  "Hắc đạo", "Gia đấu", "Học đường", "Showbiz", "Hành động",
  "Chiến đấu", "Sinh tồn", "Báo thù", "Trinh thám", "Kịch tính",
  "Hài hước", "Hài hước đen", "Parody", "Châm biếm"
];

/**
 * Build prompt for extracting title from filename
 */
export function buildExtractTitlePrompt(filename: string): { systemPrompt: string; userPrompt: string; cleaned: string } {
  const cleaned = filename.replace(/\.srt$/i, '').trim();
  
  const systemPrompt = "You are a helpful assistant that extracts core titles from filenames.";
  const userPrompt = `Extract the core title from this filename, ignoring tags/groups: ${cleaned}. Return only the title as plain text.`;
  
  return { systemPrompt, userPrompt, cleaned };
}

/**
 * Build prompt for analyzing translation style
 */
export function buildAnalyzeStylePrompt(titleOrSummary: string): { systemPrompt: string; userPrompt: string; responseSchema: object } {
  const systemPrompt = "You are a genre analysis assistant. Analyze the given title or summary and return genres and humor level.";
  const userPrompt = `Phân tích thể loại dựa trên tiêu đề hoặc bản tóm tắt sau: ${titleOrSummary}

Chỉ được phép chọn thể loại từ danh sách sau:
${GENRE_TAXONOMY.join(', ')}

Trả về JSON với format chính xác sau:
{
  "genres": ["thể loại 1", "thể loại 2"]
}

Quy tắc:
- genres: chọn 1-5 thể loại phù hợp nhất từ danh sách`;

  const responseSchema = {
    type: "object",
    properties: {
      genres: {
        type: "array",
        items: { type: "string" },
        description: "1-5 thể loại phù hợp nhất từ danh sách."
      },
      humor_level: {
        type: "integer",
        description: "Mức độ hài hước từ 0 đến 10"
      }
    },
    required: ["genres", "humor_level"]
  };

  return { systemPrompt, userPrompt, responseSchema };
}

/**
 * Parse style analysis result into TranslationPreset
 */
export function parseStyleAnalysisResult(result: any, titleOrSummary: string): import("../types").TranslationPreset {
  return {
    reference: {
      title_or_summary: titleOrSummary
    },
    genres: result.genres || [],
    character_names: [],
    humor_level: result.humor_level || 0
  };
}
