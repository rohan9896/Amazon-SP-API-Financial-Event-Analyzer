import { sellerExplanationSchema } from './types.js';
import type { ExplanationContext, ExplanationProvider, SellerExplanationBody } from './types.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiClientConfig = {
  apiKey: string;
  model: string;
};

/**
 * JSON schema handed to Gemini for structured output. Mirrors sellerExplanationSchema
 * so the model returns a directly parseable object (validated again with Zod).
 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    reason: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    recommendedAction: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['headline', 'summary', 'reason', 'evidence', 'recommendedAction', 'confidence'],
};

type GenerateContentResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

/**
 * Calls Gemini's generateContent REST endpoint. There is intentionally no fallback:
 * any missing key, network error, HTTP error, or unparseable response throws.
 */
export class GeminiClient implements ExplanationProvider {
  constructor(private readonly config: GeminiClientConfig) {}

  async generate(context: ExplanationContext): Promise<SellerExplanationBody> {
    const url = `${API_BASE}/models/${encodeURIComponent(this.config.model)}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: context.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: context.userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as GenerateContentResponse;

    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned no content to parse.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 500)}`);
    }

    const result = sellerExplanationSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Gemini output did not match the expected schema: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
      );
    }

    return result.data;
  }
}
