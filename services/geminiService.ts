import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, TranslationPreset, AiModel } from "../types";
import { 
  normalizeAiText, 
  splitToTwoLinesIfLong, 
  collapseToSingleLineIfShort,
  buildTranslationPrompt,
  buildOptimizePrompt,
  buildExtractTitlePrompt,
  buildAnalyzeStylePrompt,
  parseStyleAnalysisResult
} from "./aiServiceUtils";

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

  const { systemPrompt, userPrompt, responseSchema } = buildTranslationPrompt(
    batch, contextBefore, contextAfter, preset, maxSingleLineWords, autoSplitLongLines
  );

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
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
  const { userPrompt, cleaned } = buildExtractTitlePrompt(filename);
  
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt
  });
  
  const title = response.text?.trim() || cleaned;
  const tokens = response.usageMetadata?.totalTokenCount || 0;
  return { title, tokens };
}

export async function analyzeTranslationStyle(titleOrSummary: string, model: AiModel, apiKey: string): Promise<{ preset: TranslationPreset, tokens: number }> {
  const ai = new GoogleGenAI({ apiKey });
  const { userPrompt, responseSchema } = buildAnalyzeStylePrompt(titleOrSummary);

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
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
  const preset = parseStyleAnalysisResult(result, titleOrSummary);

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

  const { systemPrompt, userPrompt, responseSchema } = buildOptimizePrompt(segments, preset);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
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

