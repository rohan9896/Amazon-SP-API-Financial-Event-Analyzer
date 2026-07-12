import type { ReconciliationRecord } from '../domain/types.js';
import { buildCalculationBreakdown } from './breakdown.js';
import { buildExplanationContext } from './context.js';
import type { ExplainOptions, ExplanationProvider, SellerExplanation } from './types.js';

/**
 * Explain a single reconciliation record. Any provider failure propagates —
 * there is no templated fallback.
 *
 * The `calculation` field is always computed in code (formulas + cost breakdown)
 * and attached after the LLM returns narrative fields.
 */
export async function explainRecord(
  record: ReconciliationRecord,
  provider: ExplanationProvider,
  options: ExplainOptions = {},
): Promise<SellerExplanation> {
  const calculation = buildCalculationBreakdown(record, options.order, options.config);
  const context = buildExplanationContext(record, calculation);
  const body = await provider.generate(context);
  return { orderId: record.orderId, ...body, calculation };
}

/**
 * Explain many records sequentially (keeps request volume predictable and avoids
 * hammering rate limits). The first failure aborts the batch and propagates.
 */
export async function explainReport(
  records: ReconciliationRecord[],
  provider: ExplanationProvider,
  options: ExplainOptions = {},
): Promise<SellerExplanation[]> {
  const explanations: SellerExplanation[] = [];
  for (const record of records) {
    explanations.push(await explainRecord(record, provider, options));
  }
  return explanations;
}
