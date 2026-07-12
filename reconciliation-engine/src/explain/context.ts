import type { ReconciliationRecord } from '../domain/types.js';
import type { ExplanationContext } from './types.js';

const SYSTEM_INSTRUCTION = [
  'You are an assistant that explains Amazon seller payment reconciliation results in plain, friendly English.',
  'Your audience is a busy seller, not an accountant.',
  '',
  'CRITICAL RULES:',
  '- Every number you mention MUST come verbatim from the provided data. NEVER do arithmetic, estimate, or invent amounts.',
  '- "discrepancy" is the whole-order net gap (actualSettled - expectedRevenue); negative means underpaid overall.',
  '- "shortpay" is a narrower, principal-only signal: it means the product PRINCIPAL that settled was less than expected, ignoring fees/tax. The shortpay message amount (principal gap) can legitimately differ from the discrepancy — do not claim they should match.',
  '- "no_settlement" means the order had zero financial events — it never settled.',
  '- If there are no flags, reassure the seller the order looks correctly paid.',
  '- Be concise and specific. Reference the actual finance line items as evidence.',
  '- Do not suggest actions beyond reviewing the order or opening a case with Amazon.',
].join('\n');

/** Trim finance lines to the fields the model needs, keeping the payload small. */
function summarizeFinanceLines(record: ReconciliationRecord) {
  return record.financeLines.map((line) => ({
    eventCategory: line.eventCategory,
    lineType: line.lineType,
    amount: line.amount,
    currency: line.currency,
    sellerSKU: line.sellerSKU,
  }));
}

/**
 * Build the system + user prompt for a single reconciliation record.
 * Includes only the fields needed to explain the record — never credentials or env.
 */
export function buildExplanationContext(record: ReconciliationRecord): ExplanationContext {
  const payload = {
    orderId: record.orderId,
    expectedRevenue: record.expectedRevenue,
    actualSettled: record.actualSettled,
    discrepancy: record.discrepancy,
    flags: record.flags,
    flagMessages: record.flagMessages,
    financeLines: summarizeFinanceLines(record),
    warnings: record.warnings,
  };

  const userPrompt = [
    'Explain this reconciliation result to the seller.',
    'All monetary values are in the record and already final — quote them, do not recompute.',
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');

  return { systemInstruction: SYSTEM_INSTRUCTION, userPrompt };
}
