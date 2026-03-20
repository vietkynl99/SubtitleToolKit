import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset, AiModel } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

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
â€¢ Prefer lively spoken Vietnamese
â€¢ Slightly expressive wording allowed
â€¢ Mild humor or playful tone may appear
`;
  }
  if (humorLevel <= 8) {
    return `
Energetic recap-style narration.

Guidelines:
â€¢ Prefer expressive and dynamic Vietnamese phrasing
â€¢ Light sarcasm or teasing tone allowed
â€¢ Slight exaggeration allowed if meaning remains accurate
â€¢ Subtitles should feel entertaining and vivid
`;
  }
  return `
High-intensity comedic narration.

Guidelines:
â€¢ Strongly prefer vivid, punchy Vietnamese expressions
â€¢ Sarcasm, teasing tone, and playful exaggeration allowed
â€¢ Subtitles may sound like an energetic storyteller narrating events
â€¢ Avoid flat or overly literal translation
â€¢ Entertainment value is important while preserving original meaning

The emotional tone may be amplified
for entertainment as long as the original meaning stays correct.
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
  apiKey: string
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

1. Preserve meaning
Keep the original meaning accurate.
Do not invent new story information.

2. Speaker consistency
Do not change who is speaking in the subtitle.

3. Subtitle readability
Use natural spoken Vietnamese suitable for storytelling subtitles.

4. Length control + line breaking
Keep subtitles concise (target <1.4×, max <2×).
If the subtitle would exceed ${DEFAULT_SETTINGS.maxSingleLineWords} words on one line, you MUST insert a line break using the newline character "\\n" and return 2 lines.
Line breaking comes before shortening: first break into lines; if still too long, then shorten phrasing.
Prefer the shorter expression when meaning is the same.
Prefer 1 line if short.

5. Short line rule
Chinese ≤4 characters → Vietnamese 1–3 words.

6. Dynamic narration
Prefer concise, expressive Vietnamese phrasing.
Avoid overly formal written language.

7. Names and proper nouns
Keep all character names and proper nouns consistent.
- The same Chinese name must always use the same Vietnamese form.
- Do not create different spellings for similar names.
- If a term looks like a name, treat it as a name rather than translating its meaning.

8. Word choice
If multiple Vietnamese expressions are possible, prefer the more vivid and entertaining wording.

9. Context usage
Each subtitle must remain understandable independently.
Neighbor context is only for resolving pronouns or references.

${styleBlock}

${storyContext}

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

    const translatedBatch = JSON.parse(response.text?.trim() || "[]").map((item: any) => {
      if (item && typeof item.text === 'string') {
        const normalized = normalizeAiText(item.text);
        const collapsed = collapseToSingleLineIfShort(normalized, DEFAULT_SETTINGS.maxSingleLineWords);
        return { ...item, text: collapsed };
      }
      return item;
    });

    if (!Array.isArray(translatedBatch)) {
      throw new Error("Invalid response format: Expected a JSON array.");
    }

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
    term_replacements: [],
    term_replace_options: {
      case_sensitive: false,
      whole_word: false,
      regex: false
    },
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

  const payload = segments.map((s) => {
    const duration = Math.max((s.end || 0) - (s.start || 0), 0.1);
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

Rules:
- Each segment is independent.
- Do NOT merge or split segments.
- Preserve core meaning when possible.
- Prefer concise Vietnamese.
- Remove filler words if needed, but do not lose meaning.

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
