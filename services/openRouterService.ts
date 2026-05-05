import { SubtitleSegment, TranslationPreset } from "../types";
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

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema?: object
): Promise<{ content: string; tokens: number }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'SubtitleToolKit'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: responseSchema ? {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          strict: true,
          schema: responseSchema
        }
      } : undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices[0]?.message?.content || '';
  const tokens = data.usage?.total_tokens || 0;

  return { content, tokens };
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
  model: string,
  apiKey: string,
  maxSingleLineWords: number,
  autoSplitLongLines: boolean
): Promise<{ translatedTexts: { id: number; text: string }[]; tokens: number }> {

  const { systemPrompt, userPrompt, responseSchema } = buildTranslationPrompt(
    batch, contextBefore, contextAfter, preset, maxSingleLineWords, autoSplitLongLines
  );

  try {
    const { content, tokens } = await callOpenRouter(apiKey, model, systemPrompt, userPrompt, responseSchema);

    const parsed = JSON.parse(content.trim() || "[]");
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
      tokens
    };

  } catch (error) {
    console.error("Batch translation error:", error);
    throw error;
  }
}

export async function extractTitleFromFilename(filename: string, model: string, apiKey: string): Promise<{ title: string, tokens: number }> {
  const { systemPrompt, userPrompt, cleaned } = buildExtractTitlePrompt(filename);

  const { content, tokens } = await callOpenRouter(apiKey, model, systemPrompt, userPrompt);
  const title = content.trim() || cleaned;

  return { title, tokens };
}

export async function analyzeTranslationStyle(titleOrSummary: string, model: string, apiKey: string): Promise<{ preset: TranslationPreset, tokens: number }> {
  const { systemPrompt, userPrompt, responseSchema } = buildAnalyzeStylePrompt(titleOrSummary);

  const { content, tokens } = await callOpenRouter(apiKey, model, systemPrompt, userPrompt, responseSchema);
  const result = JSON.parse(content || "{}");
  const preset = parseStyleAnalysisResult(result, titleOrSummary);

  return { preset, tokens };
}

export async function aiFixSegments(
  segments: SubtitleSegment[],
  preset: TranslationPreset | null,
  model: string,
  apiKey: string,
  targetCPS: number = 20
): Promise<{ segments: SubtitleSegment[]; tokens: number }> {

  const { systemPrompt, userPrompt, responseSchema } = buildOptimizePrompt(segments, preset);

  try {
    const { content, tokens } = await callOpenRouter(apiKey, model, systemPrompt, userPrompt, responseSchema);
    const fixes = JSON.parse(content || "[]");

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
