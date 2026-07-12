import type { ReconciliationRecord } from '../domain/types.js';
import { buildExplanationContext } from './context.js';
import type { ExplanationProvider, SellerExplanation } from './types.js';

/**
 * Explain a single reconciliation record. Any provider failure propagates —
 * there is no templated fallback.
 */
export async function explainRecord(
  record: ReconciliationRecord,
  provider: ExplanationProvider,
): Promise<SellerExplanation> {
  const context = buildExplanationContext(record);
  const body = await provider.generate(context);
  return { orderId: record.orderId, ...body };
}

/**
 * Explain many records sequentially (keeps request volume predictable and avoids
 * hammering rate limits). The first failure aborts the batch and propagates.
 */
export async function explainReport(
  records: ReconciliationRecord[],
  provider: ExplanationProvider,
): Promise<SellerExplanation[]> {
  const explanations: SellerExplanation[] = [];
  for (const record of records) {
    explanations.push(await explainRecord(record, provider));
  }
  return explanations;
}
