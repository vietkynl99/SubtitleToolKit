import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset, AiModel } from "../types";

/**
 * Translates a single batch of segments with surrounding context. 
 * Returns both translated texts and token usage.
 */
export async function translateBatch(
  batch: SubtitleSegment[],
  contextBefore: string[],
  contextAfter: string[],
  preset: TranslationPreset | null,
  model: AiModel
): Promise<{ translatedTexts: string[], tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let humorInstruction = "";
  if (preset) {
    const h = preset.humor_level;
    if (h <= 3) humorInstruction = "Dịch sát nghĩa, giữ tông giọng trung tính và nghiêm túc.";
    else if (h <= 6) humorInstruction = "Hành văn nhẹ nhàng, có chút hóm hỉnh duyên dáng.";
    else if (h <= 8) humorInstruction = "Sử dụng từ ngữ sắc sảo, có chút mỉa mai hoặc châm biếm nhẹ.";
    else humorInstruction = "Giữ tông dí dỏm, phá cách nhưng vẫn gọn gàng.";
  }

  const styleContext = preset 
    ? `Style: ${preset.genres.join(', ')} | ${preset.tone.join(', ')}. ${humorInstruction}` 
    : "Style: Trung tính.";

  const contextBlock = (contextBefore.length > 0 || contextAfter.length > 0) 
    ? `- Context (xưng hô): Trước: ${JSON.stringify(contextBefore)}, Sau: ${JSON.stringify(contextAfter)}` 
    : "";

  const prompt = `Translate Chinese subtitles to Vietnamese.
    Strict Formatting:
    - Output Vietnamese ONLY. Do NOT repeat original Chinese, include parentheses, or add notes.
    - JSON array of strings in order. Each item must contain only one translated sentence.
    Requirements:
    - Independent segments: No cross-inference. Short inputs (≤4 chars) = short phrases.
    - Reading speed: Target ≤1.5x original length. Absolute cap 2x.
    - Clarity & Flow: Natural flow, no padding, no literary expansion.
    - Style DNA: ${styleContext}
    ${contextBlock}
    
    Segments: ${JSON.stringify(batch.map(s => s.originalText))}`;

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

    const translatedBatch = JSON.parse(response.text || "[]");
    const tokens = response.usageMetadata?.totalTokenCount || 0;

    if (!Array.isArray(translatedBatch)) {
      throw new Error("Invalid response format from AI");
    }
    return { translatedTexts: translatedBatch, tokens };
  } catch (error) {
    console.error("Batch translation error:", error);
    throw error;
  }
}

export async function extractTitleFromFilename(filename: string, model: AiModel): Promise<{ title: string, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleaned = filename.replace(/\.srt$/i, '').trim();
  
  const response = await ai.models.generateContent({
    model,
    contents: `Tên file sau có thể chứa nhiều thông tin không liên quan (tags, websites, groups).
    Hãy trích xuất phần có khả năng cao nhất là tiêu đề tác phẩm.
    Chỉ trả về duy nhất tiêu đề, không giải thích.

    Tên file: ${cleaned}`
  });
  
  const title = response.text?.trim() || cleaned;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title, tokens };
}

export async function translateTitle(title: string, model: AiModel): Promise<{ title: string, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: `Dịch tiêu đề tác phẩm sau sang tiếng Việt tự nhiên, phù hợp ngữ cảnh phim ảnh: ${title}`
  });
  const translated = response.text?.trim() || title;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title: translated, tokens };
}

export async function analyzeTranslationStyle(title: string, originalTitle: string, model: AiModel): Promise<{ preset: TranslationPreset, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: `Phân tích tiêu đề sau và xác định phong cách dịch (Version 2.3.0):
    Tiêu đề: ${title}

    Hãy xác định:
    1. genres: Danh sách các thể loại (Tu tiên, Tiên hiệp, Đô thị, Xuyên không, Hành động, Hài hước, v.v.)
    2. tone: Danh sách các phong cách dịch (Trang trọng, Huyền ảo, Hài hước, kịch tính, Bí ẩn, v.v.)
    3. humor_level: Mức độ hài hước từ 0 đến 10.

    Trả về JSON đúng format.
    {
      "title_original": "${originalTitle}",
      "title_vi": "${title}",
      "genres": ["...", "..."],
      "tone": ["...", "..."],
      "humor_level": 0-10
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title_original: { type: Type.STRING },
          title_vi: { type: Type.STRING },
          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
          tone: { type: Type.ARRAY, items: { type: Type.STRING } },
          humor_level: { type: Type.NUMBER }
        },
        required: ["title_original", "title_vi", "genres", "tone", "humor_level"]
      }
    }
  });
  
  const preset = JSON.parse(response.text || "{}") as TranslationPreset;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { preset, tokens };
}

/**
 * AI Content Optimization as per v3.2.0.
 * Focuses on shortening, cinematic flow, and better readability.
 */
export async function aiFixSegments(
  segments: SubtitleSegment[], 
  mode: 'safe' | 'aggressive' = 'safe',
  model: AiModel
): Promise<{ segments: SubtitleSegment[], tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const modeInstruction = mode === 'aggressive'
    ? "PRIORITY: Reduce CPS strongly. Be bold in shortening sentences to improve reading speed, even if some stylistic nuance is lost."
    : "PRIORITY: Maintain meaning and tone strictly. Only rewrite if it significantly improves readability without sacrificing plot nuance.";

  const prompt = `Review and optimize the following Vietnamese subtitle segments.

  Optimization Mode: ${mode.toUpperCase()}
  ${modeInstruction}

  Strict Requirements: 
  1. Shorten content where possible to reduce reading burden and improve CPS (Characters Per Second). 
  2. Ensure natural, punchy, and professional cinematic flow suitable for high-quality movie subtitles. 
  3. PRESERVE core meaning strictly. Do NOT add new information, do NOT change context, and do NOT remove essential plot details. 
  4. Avoid exaggeration; keep the tone natural and consistent with the original intent. 
  5. Only rewrite if it significantly improves readability, flow, or reduces excessive length. 
  6. The primary goal is improvement over the current state; the result does NOT strictly need to reach "safe" CPS levels if doing so sacrifices meaning.

  Output Format:
  - Return a JSON array of objects with 'id' and 'fixedText'.
  
  Segments to process: ${JSON.stringify(segments.map(s => ({ id: s.id, text: s.translatedText || s.originalText })))}`;

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
      return fix ? { ...s, translatedText: fix.fixedText, isModified: true } : s;
    });

    return { segments: updatedSegments, tokens };
  } catch (error) {
    console.error("AI Fix error", error);
    return { segments, tokens: 0 };
  }
}