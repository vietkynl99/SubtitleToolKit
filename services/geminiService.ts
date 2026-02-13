
import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

const API_KEY = process.env.API_KEY || "";

export async function translateSegments(segments: SubtitleSegment[]): Promise<SubtitleSegment[]> {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-3-flash-preview';

  const batchSize = 10;
  const results = [...segments];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const prompt = `Translate the following Chinese subtitle segments to natural, modern Vietnamese. 
    Keep the context consistent across segments. 
    Return a JSON array of strings in the exact same order.
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
      translatedBatch.forEach((text: string, index: number) => {
        if (results[i + index]) {
          results[i + index].translatedText = text;
        }
      });
    } catch (error) {
      console.error("Translation error in batch", i, error);
    }
  }

  return results;
}

export async function aiFixSegments(segments: SubtitleSegment[]): Promise<SubtitleSegment[]> {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-3-flash-preview';

  const prompt = `Review the following Vietnamese subtitle segments. 
  Fix issues like: unnatural wording, wrong honorifics (nhân xưng), segments that are too long for their duration, or obscure meanings.
  Keep the translations concise and natural for cinema.
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
            }
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
