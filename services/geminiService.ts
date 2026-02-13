import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

export async function translateSegments(
  segments: SubtitleSegment[], 
  onBatchStart?: (startIndex: number, count: number) => void,
  onBatchComplete?: (batchIndex: number, translatedTexts: string[]) => void
): Promise<SubtitleSegment[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const batchSize = 15;
  const results = [...segments];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    
    if (onBatchStart) {
      onBatchStart(i, batch.length);
    }

    const contextBefore = i > 0 ? segments.slice(Math.max(0, i - 2), i).map(s => s.originalText) : [];
    const contextAfter = (i + batchSize) < segments.length ? segments.slice(i + batchSize, i + batchSize + 2).map(s => s.originalText) : [];

    const prompt = `Translate the following Chinese subtitle segments to natural, modern Vietnamese. 
    Context before: ${JSON.stringify(contextBefore)}
    Context after: ${JSON.stringify(contextAfter)}
    
    Instruction: Use natural cinema style. Keep honorifics (nhân xưng) consistent.
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
        if (results[i + index]) {
          results[i + index].translatedText = text;
          results[i + index].isModified = true;
          results[i + index].isProcessing = false;
        }
      });

      if (onBatchComplete) {
        onBatchComplete(i, translatedBatch);
      }
    } catch (error) {
      console.error("Translation error in batch starting at", i, error);
      // Ensure we clear processing state on error
      batch.forEach((_, idx) => {
        if (results[i + idx]) results[i + idx].isProcessing = false;
      });
      if (onBatchComplete) onBatchComplete(i, batch.map(s => s.translatedText));
    }
  }

  return results;
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