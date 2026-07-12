import { z } from 'zod';

import type { ReconciliationConfig, ReconciliationOrder } from '../domain/types.js';
import type { CalculationBreakdown, CalculationLine } from './breakdown.js';

/**
 * Structured, seller-facing explanation of a single reconciliation record.
 * The LLM narrates numbers the engine already computed — it must not do its own math.
 */
export const sellerExplanationSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.array(z.string()),
  recommendedAction: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type SellerExplanationBody = z.infer<typeof sellerExplanationSchema>;

export type SellerExplanation = SellerExplanationBody & {
  orderId: string;
  /** Deterministic math breakdown — computed in code, not by the LLM. */
  calculation: CalculationBreakdown;
};

/**
 * The compact, safe payload handed to the model. Only the fields needed to
 * explain a record — no credentials, no raw env, no unrelated data.
 */
export type ExplanationContext = {
  systemInstruction: string;
  userPrompt: string;
};

/**
 * Anything that can turn a prepared context into an explanation body.
 * The Gemini client implements this; tests provide a stub. This is what keeps
 * the orchestration layer unit-testable without the network.
 */
export type ExplanationProvider = {
  generate(context: ExplanationContext): Promise<SellerExplanationBody>;
};

export type ExplainOptions = {
  order?: ReconciliationOrder;
  config?: ReconciliationConfig;
};

export type { CalculationBreakdown, CalculationLine };
