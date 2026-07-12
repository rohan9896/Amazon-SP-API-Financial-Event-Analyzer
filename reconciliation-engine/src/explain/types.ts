import { z } from 'zod';

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
