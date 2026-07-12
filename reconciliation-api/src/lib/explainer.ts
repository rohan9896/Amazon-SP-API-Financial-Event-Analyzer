import { GeminiClient, type ExplanationProvider } from 'reconciliation-engine';

import { env } from './env.js';

/** Thrown when an explanation is requested but no Gemini key is configured. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not set');
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Build the Gemini-backed explanation provider from env. Throws MissingApiKeyError
 * (mapped to 503 by the route) when the key is absent — there is no fallback.
 */
export function getExplanationProvider(): ExplanationProvider {
  if (!env.GEMINI_API_KEY) {
    throw new MissingApiKeyError();
  }
  return new GeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
}
