import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset, AiModel } from "../types";

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
): Promise<{ translatedTexts: string[]; tokens: number }> {

  const ai = new GoogleGenAI({ apiKey });

  // -------- HUMOR STYLE --------
  const humorLevel = preset?.humor_level ?? 0;

  let humorRule = "";

  if (humorLevel <= 2) {
    humorRule = `
Neutral narration.
Translate faithfully with clear Vietnamese subtitles.
No sarcasm or exaggeration.
`;
  }
  else if (humorLevel <= 4) {
    humorRule = `
Natural conversational narration.
Subtitles should sound like natural spoken Vietnamese.
Very mild humor allowed.
`;
  }
  else if (humorLevel <= 6) {
    humorRule = `
Playful narration style.

Guidelines:
• Prefer lively spoken Vietnamese
• Slightly expressive wording allowed
• Mild humor or playful tone may appear
`;
  }
  else if (humorLevel <= 8) {
    humorRule = `
Energetic recap-style narration.

Guidelines:
• Prefer expressive and dynamic Vietnamese phrasing
• Light sarcasm or teasing tone allowed
• Slight exaggeration allowed if meaning remains accurate
• Subtitles should feel entertaining and vivid
`;
  }
  else {
    humorRule = `
High-intensity comedic narration.

Guidelines:
• Strongly prefer vivid, punchy Vietnamese expressions
• Sarcasm, teasing tone, and playful exaggeration allowed
• Subtitles may sound like an energetic storyteller narrating events
• Avoid flat or overly literal translation
• Entertainment value is important while preserving original meaning

The emotional tone may be amplified
for entertainment as long as the original meaning stays correct.
`;
  }

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
JSON array of strings.

Core rules:

1. Preserve meaning
Keep the original meaning accurate.
Do not invent new story information.

2. Speaker consistency
Do not change who is speaking in the subtitle.

3. Subtitle readability
Use natural spoken Vietnamese suitable for storytelling subtitles.

4. Length control
Keep Vietnamese subtitles concise.
Target: <1.4× the Chinese line  
Hard limit: <2×

If a line becomes long, shorten phrasing and simplify structure.
Prefer the shorter expression when meaning is the same.

5. Short line rule
Chinese ≤4 characters → Vietnamese 1–3 words.

6. Dynamic narration
Prefer concise, expressive Vietnamese phrasing.
Avoid overly formal written language.

7. Names and proper nouns
Keep all character names and proper nouns consistent.

• The same Chinese name must always use the same Vietnamese form.
• Do not create different spellings for similar names.
• If a term looks like a name, treat it as a name rather than translating its meaning.

8. Word choice
If multiple Vietnamese expressions are possible, prefer the more vivid and entertaining wording.

9. Context usage
Each subtitle must remain understandable independently.
Neighbor context is only for resolving pronouns or references.

${styleBlock}

${storyContext}

${neighborContext}

Subtitle data:
${JSON.stringify(batch.map(s => s.originalText))}
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const translatedBatch = JSON.parse(response.text?.trim() || "[]");

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

/**
 * AI Subtitle Optimization v3.3.1.
 */
export async function aiFixSegments(
  segments: SubtitleSegment[], 
  mode: 'safe' | 'aggressive' = 'safe',
  model: AiModel,
  apiKey: string
): Promise<{ segments: SubtitleSegment[], tokens: number }> {
  const ai = new GoogleGenAI({ apiKey });

  const instruction = mode === 'aggressive'
    ? "AGGRESSIVE: Compress hard. Use short punchy Vietnamese. Prefer slangy or playful phrasing if it keeps meaning. Keep the funny/lầy vibe."
    : "SAFE: Slightly tighten wording. Keep natural spoken Vietnamese and humorous tone if present.";

  const prompt = `Optimize Vietnamese subtitles for readability and CPS.

${instruction}

Rules:
- Segment units are independent. Do NOT merge or split.
- Preserve the core meaning.
- Prefer shorter words and punchy phrasing.
- Keep natural spoken Vietnamese (casual, meme-like tone allowed).
- If original line is playful, keep the humor/lầy vibe.
- Remove redundant filler but keep character voice.

Length control:
- Target ≤1.3x original length
- Hard limit ≤1.6x
- If Chinese original ≤4 characters → Vietnamese 1–3 words.

Output format:
JSON array [{id, fixedText}]

Data:
${JSON.stringify(segments.map(s => ({
  id: s.id,
  text: s.translatedText || s.originalText
})))}`;

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
              fixedText: { type: Type.STRING }
            },
            required: ["id", "fixedText"]
          }
        }
      }
    });

    const fixes = JSON.parse(response.text || "[]");
    const tokens = response.usageMetadata?.totalTokenCount || 0;
    
    const updatedSegments = segments.map(s => {
      const fix = fixes.find((f: any) => f.id === s.id);
      return fix ? { ...s, translatedText: fix.fixedText } : s;
    });

    return { segments: updatedSegments, tokens };
  } catch (error) {
    console.error("AI Fix error:", error);
    return { segments, tokens: 0 };
  }
}

