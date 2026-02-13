import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

export async function translateSegments(
  segments: SubtitleSegment[], 
  onBatchStart?: (startIndex: number, count: number) => void,
  onBatchComplete?: (batchIndex: number, translatedTexts: string[]) => void
): Promise<SubtitleSegment[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  // v1.3.0 Logic: Only translate if translatedText is null or empty
  const segmentsToTranslateIndices = segments
    .map((s, idx) => ({ s, idx }))
    .filter(item => !item.s.translatedText || item.s.translatedText.trim() === '')
    .map(item => item.idx);

  if (segmentsToTranslateIndices.length === 0) {
    return segments;
  }

  const batchSize = 15;
  const results = [...segments];

  for (let i = 0; i < segmentsToTranslateIndices.length; i += batchSize) {
    const currentIndicesBatch = segmentsToTranslateIndices.slice(i, i + batchSize);
    const batch = currentIndicesBatch.map(idx => segments[idx]);
    
    if (onBatchStart) {
      onBatchStart(currentIndicesBatch[0], currentIndicesBatch.length);
    }

    const prompt = `Translate the following Chinese subtitle segments to natural, modern Vietnamese.
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