export * from './domain/types.js';
export { reconcile } from './engine/reconcile.js';
export { normalizeOrders } from './normalize/orders.js';
export { normalizeFinancialEvents } from './normalize/finances.js';
export {
  detectNoSettlement,
  detectShortpay,
  detectUnexplainedFee,
  detectMissingReimbursement,
} from './rules/index.js';
export { buildExplanationContext } from './explain/context.js';
export { explainRecord, explainReport } from './explain/explain.js';
export { GeminiClient } from './explain/gemini-client.js';
export {
  sellerExplanationSchema,
  type SellerExplanation,
  type SellerExplanationBody,
  type ExplanationContext,
  type ExplanationProvider,
} from './explain/types.js';
