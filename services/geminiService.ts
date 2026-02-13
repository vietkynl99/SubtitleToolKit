import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset } from "../types";

export async function translateSegments(
  segments: SubtitleSegment[], 
  onBatchStart?: (startIndex: number, count: number) => void,
  onBatchComplete?: (batchIndex: number, translatedTexts: string[]) => void,
  preset?: TranslationPreset
): Promise<SubtitleSegment[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const segmentsToTranslateIndices = segments
    .map((s, idx) => ({ s, idx }))
    .filter(item => !item.s.translatedText || item.s.translatedText.trim() === '')
    .map(item => item.idx);

  if (segmentsToTranslateIndices.length === 0) {
    return segments;
  }

  const batchSize = 15;
  const results = [...segments];

  // v2.2.0 Style Context
  const styleInstruction = preset ? `
  Style Context:
  - Genres: ${preset.genres.join(', ')}
  - Tone: ${preset.tone.join(', ')}
  - Humor Level: ${preset.humor_level}/10
  Ensure consistent honorifics (nhân xưng) and vocabulary matching this creative direction.
  ` : "";

  for (let i = 0; i < segmentsToTranslateIndices.length; i += batchSize) {
    const currentIndicesBatch = segmentsToTranslateIndices.slice(i, i + batchSize);
    const batch = currentIndicesBatch.map(idx => segments[idx]);
    
    if (onBatchStart) {
      onBatchStart(currentIndicesBatch[0], currentIndicesBatch.length);
    }

    const prompt = `Translate the following Chinese subtitle segments to natural, modern Vietnamese.
    Instruction: Use natural cinema style. ${styleInstruction}
    Return a JSON array of strings in the exact same order as the provided segments.
    
    Segments to translate: ${JSON.stringify(batch.map(s => s.originalText))}`;

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
      
      translatedBatch.forEach((text: string, index: number) => {
        const realIdx = currentIndicesBatch[index];
        if (results[realIdx]) {
          results[realIdx].translatedText = text;
          results[realIdx].isModified = true;
          results[realIdx].isProcessing = false;
        }
      });

      if (onBatchComplete) {
        onBatchComplete(i, translatedBatch);
      }
    } catch (error) {
      console.error("Translation error in batch starting at relative index", i, error);
      currentIndicesBatch.forEach(idx => {
        if (results[idx]) results[idx].isProcessing = false;
      });
      if (onBatchComplete) onBatchComplete(i, batch.map(s => s.translatedText || ""));
    }
  }

  return results;
}

export async function extractTitleFromFilename(filename: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleaned = filename.replace(/\.srt$/i, '').trim();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tên file sau có thể chứa nhiều thông tin không liên quan (tags, websites, groups).
    Hãy trích xuất phần có khả năng cao nhất là tiêu đề tác phẩm.
    Chỉ trả về duy nhất tiêu đề, không giải thích.

    Tên file: ${cleaned}`
  });
  
  return response.text?.trim() || cleaned;
}

export async function translateTitle(title: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Dịch tiêu đề tác phẩm sau sang tiếng Việt tự nhiên, phù hợp ngữ cảnh phim ảnh: ${title}`
  });
  return response.text?.trim() || title;
}

export async function analyzeTranslationStyle(title: string, originalTitle: string): Promise<TranslationPreset> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Phân tích tiêu đề sau và xác định phong cách dịch (Version 2.2.0):
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
  
  return JSON.parse(response.text || "{}") as TranslationPreset;
}

export async function aiFixSegments(segments: SubtitleSegment[]): Promise<SubtitleSegment[]> {
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
    return segments.map(s => {
      const fix = fixes.find((f: any) => f.id === s.id);
      return fix ? { ...s, translatedText: fix.fixedText, isModified: true } : s;
    });
  } catch (error) {
    console.error("AI Fix error", error);
    return segments;
  }
}