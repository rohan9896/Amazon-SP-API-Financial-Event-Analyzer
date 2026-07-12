import type {
  ReconciliationConfig,
  ReconciliationFinanceLine,
  ReconciliationOrder,
  ReconciliationRecord,
} from '../domain/types.js';
import { DEFAULT_RECONCILIATION_CONFIG, RECONCILABLE_STATUSES } from '../domain/types.js';
import { dedupeFinanceLines, joinFinanceLinesToOrder } from '../lib/join.js';
import { roundCurrency } from '../lib/money.js';
import { detectNoSettlement, detectShortpay } from '../rules/index.js';

function computeExpectedRevenue(
  order: ReconciliationOrder,
  config: ReconciliationConfig,
): number {
  const itemSubtotal = order.items.reduce((sum, item) => sum + item.itemPrice, 0);
  const shippingTotal = order.items.reduce((sum, item) => sum + item.shippingPrice, 0);
  const taxTotal = order.items.reduce((sum, item) => sum + item.itemTax, 0);
  const grossRevenue = itemSubtotal + shippingTotal + taxTotal;
  const commissionFee = itemSubtotal * config.commissionRate;

  return roundCurrency(grossRevenue - commissionFee);
}

function computeActualSettled(financeLines: ReconciliationFinanceLine[]): number {
  return roundCurrency(financeLines.reduce((sum, line) => sum + line.amount, 0));
}

function reconcileOrder(
  order: ReconciliationOrder,
  allFinanceLines: ReconciliationFinanceLine[],
  config: ReconciliationConfig,
  warnings: string[],
): ReconciliationRecord {
  const itemSkus = order.items.map((item) => item.sellerSKU);
  const joinedLines = dedupeFinanceLines(
    joinFinanceLinesToOrder(order.orderId, itemSkus, allFinanceLines),
  );

  const expectedRevenue = computeExpectedRevenue(order, config);
  const actualSettled = computeActualSettled(joinedLines);
  const discrepancy = roundCurrency(actualSettled - expectedRevenue);

  const noSettlement = detectNoSettlement(joinedLines);
  const shortpay = joinedLines.length > 0 ? detectShortpay(order, joinedLines, config) : { flags: [], messages: [] };

  const flags = [...noSettlement.flags, ...shortpay.flags];
  const flagMessages = [...noSettlement.messages, ...shortpay.messages];

  return {
    orderId: order.orderId,
    expectedRevenue,
    actualSettled,
    discrepancy,
    flags,
    flagMessages,
    financeLines: joinedLines,
    warnings,
  };
}

export function reconcile(
  orders: ReconciliationOrder[],
  financeLines: ReconciliationFinanceLine[],
  config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG,
  orderWarnings: Record<string, string[]> = {},
): ReconciliationRecord[] {
  const dedupedLines = dedupeFinanceLines(financeLines);
  const report: ReconciliationRecord[] = [];

  for (const order of orders) {
    if (!RECONCILABLE_STATUSES.has(order.orderStatus)) {
      continue;
    }

    report.push(
      reconcileOrder(order, dedupedLines, config, orderWarnings[order.orderId] ?? []),
    );
  }

  return report;
}
