import type {
  ReconciliationConfig,
  ReconciliationFinanceLine,
  ReconciliationFlag,
  ReconciliationOrder,
} from '../domain/types.js';
import { formatCurrency, roundCurrency } from '../lib/money.js';

export type RuleResult = {
  flags: ReconciliationFlag[];
  messages: string[];
};

export function detectNoSettlement(financeLines: ReconciliationFinanceLine[]): RuleResult {
  if (financeLines.length === 0) {
    return {
      flags: ['no_settlement'],
      messages: ['Never settled'],
    };
  }

  return { flags: [], messages: [] };
}

export function detectShortpay(
  order: ReconciliationOrder,
  financeLines: ReconciliationFinanceLine[],
  config: ReconciliationConfig,
): RuleResult {
  const expectedPrincipal = roundCurrency(
    order.items.reduce((sum, item) => sum + item.itemPrice, 0),
  );

  const actualPrincipal = roundCurrency(
    financeLines
      .filter((line) => line.lineType === 'Principal')
      .reduce((sum, line) => sum + line.amount, 0),
  );

  const principalGap = roundCurrency(actualPrincipal - expectedPrincipal);

  if (principalGap < -config.shortpayTolerance) {
    return {
      flags: ['shortpay'],
      messages: [`Underpaid by ${formatCurrency(principalGap)}`],
    };
  }

  return { flags: [], messages: [] };
}

/** Phase 2 stub — not wired into reconcile() yet. */
export function detectUnexplainedFee(): RuleResult {
  return { flags: [], messages: [] };
}

/** Phase 2 stub — not wired into reconcile() yet. */
export function detectMissingReimbursement(): RuleResult {
  return { flags: [], messages: [] };
}
