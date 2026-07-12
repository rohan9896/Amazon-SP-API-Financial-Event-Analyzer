import type { ReconciliationRecord } from '../domain/types.js';
import type { CalculationBreakdown } from './breakdown.js';
import type { ExplanationContext } from './types.js';

const SYSTEM_INSTRUCTION = [
  'You are an assistant that explains Amazon seller payment reconciliation results in plain, friendly English.',
  'Your audience is a busy seller, not an accountant.',
  '',
  'CRITICAL RULES:',
  '- Every number you mention MUST come verbatim from the provided data. NEVER do arithmetic, estimate, or invent amounts.',
  '- A deterministic "calculation" object is included with formulas and step-by-step breakdowns. Quote those steps; do not recompute.',
  '- "discrepancy" is the whole-order net gap (actualSettled - expectedRevenue); negative means underpaid overall.',
  '- "shortpay" is a narrower, principal-only signal: it means the product PRINCIPAL that settled was less than expected, ignoring fees/tax. The shortpay message amount (principal gap) can legitimately differ from the discrepancy — do not claim they should match.',
  '- "no_settlement" means the order had zero financial events — it never settled.',
  '- If there are no flags, reassure the seller the order looks correctly paid.',
  '- Be concise and specific. Reference the calculation steps and finance lines as evidence.',
  '- Do not suggest actions beyond reviewing the order or opening a case with Amazon.',
].join('\n');

/**
 * Build the system + user prompt for a single reconciliation record.
 * Includes the deterministic calculation breakdown so the model can narrate it.
 */
export function buildExplanationContext(
  record: ReconciliationRecord,
  calculation: CalculationBreakdown,
): ExplanationContext {
  const payload = {
    orderId: record.orderId,
    expectedRevenue: record.expectedRevenue,
    actualSettled: record.actualSettled,
    discrepancy: record.discrepancy,
    flags: record.flags,
    flagMessages: record.flagMessages,
    warnings: record.warnings,
    calculation,
  };

  const userPrompt = [
    'Explain this reconciliation result to the seller.',
    'All monetary values and the calculation breakdown are already final — quote them, do not recompute.',
    'In the reason/evidence, briefly walk through the expected-revenue formula, the actual settlement sum, and the discrepancy.',
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');

  return { systemInstruction: SYSTEM_INSTRUCTION, userPrompt };
}
