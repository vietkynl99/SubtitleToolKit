import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset } from "../types";

/**
 * Translates a single batch of segments with surrounding context. 
 * Returns both translated texts and token usage.
 */
export async function translateBatch(
  batch: SubtitleSegment[],
  contextBefore: string[],
  contextAfter: string[],
  preset?: TranslationPreset
): Promise<{ translatedTexts: string[], tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  // v2.3.0 Style DNA integration
  const styleInstruction = preset ? `
  --- STYLE DNA CONTEXT ---
  Tác phẩm này thuộc thể loại: ${preset.genres.join(', ')}.
  Tông giọng chủ đạo: ${preset.tone.join(', ')}.
  Mức độ hài hước/giải trí: ${preset.humor_level}/10.
  Yêu cầu: Sử dụng đại từ nhân xưng (xưng hô) và từ vựng phù hợp với phong cách trên. 
  Nếu là phim hài, hãy dịch thoát ý, hóm hỉnh. Nếu là tiên hiệp, hãy dùng từ Hán Việt trang trọng đúng mực.
  -------------------------
  ` : "";

  const contextPrompt = (contextBefore.length > 0 || contextAfter.length > 0) ? `
  Use the following context to ensure continuity and correct character address (xưng hô):
  ${contextBefore.length > 0 ? `- Context Before: ${JSON.stringify(contextBefore)}` : ''}
  ${contextAfter.length > 0 ? `- Context After: ${JSON.stringify(contextAfter)}` : ''}
  (Note: Do NOT translate the context lines, only use them for reference.)
  ` : "";

  const prompt = `Translate the following Chinese subtitle segments to natural, modern Vietnamese.
    Instruction: Use natural cinema style.
    ${styleInstruction}
    ${contextPrompt}
    Return a JSON array of strings in the exact same order as the provided main segments.
    
    Main Segments to translate: ${JSON.stringify(batch.map(s => s.originalText))}`;

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

export async function extractTitleFromFilename(filename: string): Promise<{ title: string, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleaned = filename.replace(/\.srt$/i, '').trim();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tên file sau có thể chứa nhiều thông tin không liên quan (tags, websites, groups).
    Hãy trích xuất phần có khả năng cao nhất là tiêu đề tác phẩm.
    Chỉ trả về duy nhất tiêu đề, không giải thích.

    Tên file: ${cleaned}`
  });
  
  const title = response.text?.trim() || cleaned;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title, tokens };
}

export async function translateTitle(title: string): Promise<{ title: string, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Dịch tiêu đề tác phẩm sau sang tiếng Việt tự nhiên, phù hợp ngữ cảnh phim ảnh: ${title}`
  });
  const translated = response.text?.trim() || title;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title: translated, tokens };
}

export async function analyzeTranslationStyle(title: string, originalTitle: string): Promise<{ preset: TranslationPreset, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Phân tích tiêu đề sau và xác định phong cách dịch (Version 2.3.0):
    Tiêu đề: ${title}

    Hãy xác định:
    1. genres: Danh sách các thể loại (Tu tiên, Tiên hiệp, Đô thị, Xuyên không, Hành động, Hài hước, v.v.)
    2. tone: Danh sách các phong cách dịch (Trang trọng, Huyền ảo, Hài hước, Kịch tính, Bí ẩn, v.v.)
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

export async function aiFixSegments(segments: SubtitleSegment[]): Promise<{ segments: SubtitleSegment[], tokens: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  const prompt = `Review and optimize the following Vietnamese subtitle segments. 
  Fix: unnatural wording, wrong honorifics, or segments too long for their duration.
  Keep it concise.
  Return a JSON array of objects with 'id' and 'fixedText'.
  
  Segments: ${JSON.stringify(segments.map(s => ({ id: s.id, text: s.translatedText || s.originalText })))}`;

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