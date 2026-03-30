import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset, AiModel } from "../types";
import { timeToSeconds } from "./subtitleLogic";

function normalizeAiText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
}

function countWords(text: string): number {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return 0;
  return normalized.split(' ').length;
}

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

function collapseToSingleLineIfShort(text: string, maxWords: number = 10): string {
  if (!text.includes('\n')) return text;
  const singleLine = text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (countWords(singleLine) <= maxWords) return singleLine;
  return text;
}

function getHumorRule(humorLevel: number): string {
  if (humorLevel <= 2) {
    return `
Neutral narration.
Translate faithfully with clear Vietnamese subtitles.
No sarcasm or exaggeration.
`;
  }
  if (humorLevel <= 4) {
    return `
Natural conversational narration.
Subtitles should sound like natural spoken Vietnamese.
Very mild humor allowed.
`;
  }
  if (humorLevel <= 6) {
    return `
Playful narration style.

Guidelines:
- Prefer lively spoken Vietnamese
- Slightly expressive wording allowed
- Mild humor or playful tone may appear
`;
  }
  if (humorLevel <= 8) {
    return `
Energetic recap-style narration.

Guidelines:
- Prefer expressive and dynamic Vietnamese phrasing
- Light sarcasm or teasing tone allowed
- Slight exaggeration allowed if meaning remains accurate
- Subtitles should feel entertaining and vivid
`;
  }
return `
Chaotic comedic narrator mode (MAX LEVEL).

Core Style:
- Rewrite lines with a strong humorous and expressive narration style
- Sound like a sarcastic, over-the-top Vietnamese storyteller by default

Humor Behavior:
- Actively inject humor into lines as a default behavior
- Use exaggeration, teasing, and playful mockery naturally
- Add narrator attitude and personality into phrasing

- Express humor by rewriting the sentence, not by adding extra words
- Replace the original phrasing with a shorter, punchy and expressive version
- Prefer simplifying and compressing the sentence while keeping strong tone and attitude
- Do not keep the original sentence structure if it results in longer output
- Reduce or remove less important details to keep the line concise and impactful
- Break complex ideas into simpler, punchier phrasing

Reactions:
- Naturally include short reactions where it fits (e.g. "ủa gì vậy", "ảo thật", "wtf")
- Integrate reactions into the sentence instead of appending them as extra clauses

Narration Feel:
- Lines should feel like a fast, entertaining recap, not a full or literal translation
- Avoid plain, flat, or overly complete phrasing
`;
}

function getCharacterRules(preset: TranslationPreset | null): string {
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
 * Translates a single batch of segments with surrounding context. 
 * Tolerant to partial AI responses for improved reliability.
 */
export async function translateBatch(
  batch: SubtitleSegment[],
  contextBefore: string[],
  contextAfter: string[],
  preset: TranslationPreset | null,
  model: AiModel,
  apiKey: string,
  maxSingleLineWords: number,
  autoSplitLongLines: boolean
): Promise<{ translatedTexts: { id: number; text: string }[]; tokens: number }> {

  const ai = new GoogleGenAI({ apiKey });

  // -------- HUMOR STYLE --------
  const humorLevel = preset?.humor_level ?? 0;

  const humorRule = getHumorRule(humorLevel);

  // -------- STYLE BLOCK --------
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

  // -------- STORY CONTEXT --------
  const storyContext = preset?.reference?.title_or_summary
    ? `Story context: ${preset.reference.title_or_summary}`
    : "";
  const characterRules = getCharacterRules(preset);
  const hasCharacterRules = Boolean(characterRules && characterRules.trim().length);

  // -------- NEIGHBOR CONTEXT --------
  const neighborContext =
    contextBefore.length || contextAfter.length
      ? `
Neighbor subtitles (reference only):
Prev: ${JSON.stringify(contextBefore)}
Next: ${JSON.stringify(contextAfter)}
`
      : "";

  // -------- PROMPT --------
  const prompt = `
Translate Chinese subtitles into natural Vietnamese.

Output format:
JSON array of objects: [{"id": number, "text": string}]

IMPORTANT:
Return one object per input line using the exact id.
Do not reorder items.
Do not omit items.

Core rules:

1. Speaker & POV consistency
Before translating, check if any name matches a known character (including variants).
Do NOT add character names or subjects that are not explicitly in the original text.
Do NOT change point of view or who is speaking.
Keep pronouns and forms of address consistent for the same character throughout the batch.

2. Preserve meaning
Keep the core meaning accurate.
Do not invent new story events.
Rephrasing, tone adaptation, and adding short reactions are allowed as long as the core meaning remains unchanged.

3. Subtitle readability
Use natural spoken Vietnamese suitable for storytelling subtitles.

4. Length control + line breaking
Keep subtitles very concise (target <1.2×, max <1.5×).
${autoSplitLongLines
  ? `If the subtitle would exceed ${maxSingleLineWords} words on one line, you MUST insert a line break using the newline character "\\n" and return 2 lines.
Line breaking comes before shortening: first break into lines; if still too long, then shorten phrasing.`
  : `Line breaks are optional. Do not force a line break based only on word count.`}
Prefer the shorter expression when meaning is the same.
Maximum 2 lines.

5. Short line rule
Chinese ≤4 characters → Vietnamese 1–3 words.

6. Dynamic narration
Prefer concise, expressive Vietnamese phrasing.
Avoid overly formal written language.

7. Names and proper nouns
Keep all character names and proper nouns consistent.
${hasCharacterRules ? `- The same Chinese name must always use the same Vietnamese form.
- Do not create different spellings for similar names.
` : ""}
- If a term looks like a name, treat it as a name rather than translating its meaning.

8. Word choice
Strongly prefer vivid, expressive, and entertaining Vietnamese phrasing over neutral or literal wording when meaning is preserved.
Humor can replace neutral phrasing instead of adding extra words.

9. Emphasis without quotes
Do not use single quotes, double quotes, or brackets for emphasis.
If emphasis is needed, express it by word choice, not punctuation.

10. Context usage
Each subtitle must remain understandable independently.
Neighbor context is only for resolving pronouns or references.

11. Style priority
When there is a conflict between neutral translation and narration style, follow the narration style as long as the core meaning is preserved.

${styleBlock}

${storyContext}

${hasCharacterRules ? characterRules : ""}

${neighborContext}

Subtitle data:
${JSON.stringify(batch.map(s => ({ id: s.id, text: s.originalText })))}
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              text: { type: Type.STRING }
            },
            required: ["id", "text"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "[]");
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid response format: Expected a JSON array.");
    }

    const allowedIds = new Set(batch.map(s => s.id));
    const seenIds = new Set<number>();
    const translatedBatch = parsed
      .filter((item: any) => {
        if (!item || typeof item.id !== 'number' || typeof item.text !== 'string') return false;
        if (!allowedIds.has(item.id)) return false;
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .map((item: any) => {
        let normalized = normalizeAiText(item.text);
        if (autoSplitLongLines) {
          normalized = splitToTwoLinesIfLong(normalized, maxSingleLineWords);
        }
        const collapsed = collapseToSingleLineIfShort(normalized, maxSingleLineWords);
        return { id: item.id, text: collapsed };
      });

    return {
      translatedTexts: translatedBatch,
      tokens: response.usageMetadata?.totalTokenCount || 0
    };

  } catch (error) {
    console.error("Batch translation error:", error);
    throw error;
  }
}

export async function extractTitleFromFilename(filename: string, model: AiModel, apiKey: string): Promise<{ title: string, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey });
  const cleaned = filename.replace(/\.srt$/i, '').trim();
  
  const response = await ai.models.generateContent({
    model,
    contents: `Extract the core title from this filename, ignoring tags/groups: ${cleaned}`
  });
  
  const title = response.text?.trim() || cleaned;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title, tokens };
}

export async function analyzeTranslationStyle(titleOrSummary: string, model: AiModel, apiKey: string): Promise<{ preset: TranslationPreset, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey });
  
  const taxonomy = {
    genres: [
      "Tu tiên", "Tiên hiệp", "Huyền huyễn", "Hệ thống", "Xuyên không", 
      "Trọng sinh", "Dị giới", "Dị năng", "Thần thoại", "Quỷ dị", 
      "Huyền nghi", "Mạt thế", "Đô thị", "Tổng tài", "Thương chiến", 
      "Hắc đạo", "Gia đấu", "Học đường", "Showbiz", "Hành động", 
      "Chiến đấu", "Sinh tồn", "Báo thù", "Trinh thám", "Kịch tính", 
      "Hài hước", "Hài hước đen", "Parody", "Châm biếm"
    ],
  };

  const response = await ai.models.generateContent({
    model,
    contents: `Phân tích thể loại dựa trên tiêu đề hoặc bản tóm tắt sau: ${titleOrSummary}.
Chỉ được phép chọn từ danh sách sau:
Genres: ${taxonomy.genres.join(', ')}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          genres: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "1-5 thể loại phù hợp nhất từ danh sách."
          },
          humor_level: { 
            type: Type.NUMBER,
            description: "Mức độ hài hước từ 0 đến 10"
          }
        },
        required: ["genres", "humor_level"]
      }
    }
  });
  
  const result = JSON.parse(response.text || "{}");
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  
  const preset: TranslationPreset = {
    reference: {
      title_or_summary: titleOrSummary
    },
    genres: result.genres || [],
    character_names: [],
    humor_level: result.humor_level || 0
  };

  return { preset, tokens };
}

export async function aiFixSegments(
  segments: SubtitleSegment[],
  preset: TranslationPreset | null,
  model: AiModel,
  apiKey: string,
  targetCPS: number = 20
): Promise<{ segments: SubtitleSegment[]; tokens: number }> {

  const ai = new GoogleGenAI({ apiKey });

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

  const prompt = `
Optimize Vietnamese subtitles for readability and CPS.

${styleBlock}
${storyContext}
${hasCharacterRules ? characterRules : ""}

Rules:
- Each segment is independent.
- Do NOT merge or split segments.
- Preserve core meaning when possible.
- Prefer concise Vietnamese.
${hasCharacterRules ? `- Apply character name normalization rules strictly; never invent or vary character names.
` : ""}- Remove filler words if needed, but do not lose meaning.
- Remove filler words if needed, but do not lose meaning.
- Output must be Vietnamese only (Latin script). Do not include Chinese characters or any non-Latin letters.
- If any Chinese characters appear in the input, translate them into Vietnamese words.
- If the output still contains Chinese characters, it is invalid and must be rewritten.

Goal:
- Reduce CPS compared to currentCps while preserving meaning and fluency.
- If currentCps is already low, keep it similar and avoid over-shortening.

Special rule:
If Chinese text length ≤4 characters → output 2–4 Vietnamese words if possible.

Output format:
JSON array [{id, fixedText}]

Segments:
${JSON.stringify(payload)}
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              fixedText: { type: Type.STRING },
            },
            required: ["id", "fixedText"],
          },
        },
      },
    });

    const fixes = JSON.parse(response.text || "[]");
    const tokens = response.usageMetadata?.totalTokenCount || 0;

    const updatedSegments = segments.map((s) => {
      const fix = fixes.find((f: any) => f.id === s.id);

      if (!fix) return s;

      let text = normalizeAiText(fix.fixedText.trim());

      return {
        ...s,
        translatedText: text,
      };
    });

    return { segments: updatedSegments, tokens };
  } catch (error) {
    console.error("AI Fix error:", error);
    throw error;
  }
}

