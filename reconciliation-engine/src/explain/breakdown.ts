import type {
  ReconciliationConfig,
  ReconciliationOrder,
  ReconciliationRecord,
} from '../domain/types.js';
import { DEFAULT_RECONCILIATION_CONFIG } from '../domain/types.js';
import { formatCurrency, roundCurrency } from '../lib/money.js';

export type CalculationLine = {
  label: string;
  eventCategory: string;
  lineType: string;
  amount: number;
};

export type CalculationBreakdown = {
  formulas: {
    expectedRevenue: string;
    actualSettled: string;
    discrepancy: string;
    principalGap: string;
  };
  expected: {
    commissionRate: number;
    itemSubtotal: number;
    shippingTotal: number;
    taxTotal: number;
    commissionFee: number;
    expectedRevenue: number;
    steps: string[];
  };
  actual: {
    lines: CalculationLine[];
    credits: number;
    debits: number;
    actualSettled: number;
    steps: string[];
  };
  discrepancy: {
    value: number;
    meaning: 'underpaid' | 'overpaid' | 'matched';
    steps: string[];
  };
  principal: {
    expectedPrincipal: number;
    actualPrincipal: number;
    principalGap: number;
    shortpayTolerance: number;
    shortpayTriggered: boolean;
    steps: string[];
  };
};

function money(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatCurrency(amount)}`;
}

/**
 * Build a deterministic cost breakdown from the reconciliation record (and order when available).
 * Numbers are computed in code — never by the LLM — so the UI can show exact formulas safely.
 */
export function buildCalculationBreakdown(
  record: ReconciliationRecord,
  order?: ReconciliationOrder,
  config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG,
): CalculationBreakdown {
  const itemSubtotal = order
    ? roundCurrency(order.items.reduce((sum, item) => sum + item.itemPrice, 0))
    : 0;
  const shippingTotal = order
    ? roundCurrency(order.items.reduce((sum, item) => sum + item.shippingPrice, 0))
    : 0;
  const taxTotal = order
    ? roundCurrency(order.items.reduce((sum, item) => sum + item.itemTax, 0))
    : 0;
  const commissionFee = order
    ? roundCurrency(itemSubtotal * config.commissionRate)
    : 0;

  const expectedRevenue = record.expectedRevenue;

  const expectedSteps = order
    ? [
        `Item subtotal (Σ itemPrice) = ${money(itemSubtotal)}`,
        `Shipping total = ${money(shippingTotal)}`,
        `Tax total = ${money(taxTotal)}`,
        `Commission fee = itemSubtotal × ${config.commissionRate} = ${money(itemSubtotal)} × ${config.commissionRate} = ${money(commissionFee)}`,
        `expectedRevenue = ${money(itemSubtotal)} + ${money(shippingTotal)} + ${money(taxTotal)} − ${money(commissionFee)} = ${money(expectedRevenue)}`,
      ]
    : [
        `expectedRevenue (from reconciliation) = ${money(expectedRevenue)}`,
        `Formula: itemSubtotal + shipping + tax − (itemSubtotal × ${config.commissionRate})`,
        'Order line items were not available for this explanation — itemized expected steps omitted.',
      ];

  const lines: CalculationLine[] = record.financeLines.map((line) => ({
    label: `${line.eventCategory.replace(/EventList$/, '')} · ${line.lineType}`,
    eventCategory: line.eventCategory,
    lineType: line.lineType,
    amount: line.amount,
  }));

  const credits = roundCurrency(lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0));
  const debits = roundCurrency(lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0));
  const actualSettled = record.actualSettled;

  const actualSteps = [
    ...lines.map((l) => `${l.label}: ${money(l.amount)}`),
    `Credits (sum of positives) = ${money(credits)}`,
    `Debits (sum of negatives) = ${money(debits)}`,
    `actualSettled = Σ(all finance line amounts) = ${money(credits)} + (${money(debits)}) = ${money(actualSettled)}`,
  ];

  if (lines.length === 0) {
    actualSteps.length = 0;
    actualSteps.push('No finance lines joined to this order (never settled).');
    actualSteps.push(`actualSettled = ${money(0)}`);
  }

  const discrepancyValue = record.discrepancy;
  const meaning: CalculationBreakdown['discrepancy']['meaning'] =
    discrepancyValue < -0.005 ? 'underpaid' : discrepancyValue > 0.005 ? 'overpaid' : 'matched';

  const discrepancySteps = [
    `discrepancy = actualSettled − expectedRevenue = ${money(actualSettled)} − ${money(expectedRevenue)} = ${money(discrepancyValue)}`,
    meaning === 'underpaid'
      ? `Negative discrepancy means the seller was underpaid overall by ${money(Math.abs(discrepancyValue))}.`
      : meaning === 'overpaid'
        ? `Positive discrepancy means the settlement exceeded expected revenue by ${money(discrepancyValue)}.`
        : 'Discrepancy is within rounding of zero — net settlement matches expected revenue.',
  ];

  const expectedPrincipal = order
    ? roundCurrency(order.items.reduce((sum, item) => sum + item.itemPrice, 0))
    : 0;
  const actualPrincipal = roundCurrency(
    record.financeLines
      .filter((line) => line.lineType === 'Principal')
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const principalGap = order
    ? roundCurrency(actualPrincipal - expectedPrincipal)
    : 0;
  const shortpayTriggered = record.flags.includes('shortpay');

  const principalSteps = order
    ? [
        `expectedPrincipal = Σ(itemPrice) = ${money(expectedPrincipal)}`,
        `actualPrincipal = Σ(finance lines where lineType = Principal) = ${money(actualPrincipal)}`,
        `principalGap = actualPrincipal − expectedPrincipal = ${money(actualPrincipal)} − ${money(expectedPrincipal)} = ${money(principalGap)}`,
        `shortpay fires when principalGap < −tolerance (tolerance = ${money(config.shortpayTolerance)}) → ${shortpayTriggered ? 'YES, shortpay flagged' : 'no shortpay'}`,
        'Note: shortpay is principal-only; it can differ from the whole-order discrepancy (which includes fees, tax, chargebacks, etc.).',
      ]
    : [
        `actualPrincipal = Σ(Principal finance lines) = ${money(actualPrincipal)}`,
        `shortpay flagged: ${shortpayTriggered ? 'yes' : 'no'}`,
        'Order line items were not available — expectedPrincipal / principalGap steps omitted.',
        'Note: shortpay is principal-only; it can differ from the whole-order discrepancy.',
      ];

  return {
    formulas: {
      expectedRevenue: `itemSubtotal + shippingTotal + taxTotal − (itemSubtotal × ${config.commissionRate})`,
      actualSettled: 'Σ(financeLine.amount for all lines joined to the order)',
      discrepancy: 'actualSettled − expectedRevenue',
      principalGap: 'Σ(Principal amounts) − Σ(itemPrice)',
    },
    expected: {
      commissionRate: config.commissionRate,
      itemSubtotal,
      shippingTotal,
      taxTotal,
      commissionFee,
      expectedRevenue,
      steps: expectedSteps,
    },
    actual: {
      lines,
      credits,
      debits,
      actualSettled,
      steps: actualSteps,
    },
    discrepancy: {
      value: discrepancyValue,
      meaning,
      steps: discrepancySteps,
    },
    principal: {
      expectedPrincipal,
      actualPrincipal,
      principalGap,
      shortpayTolerance: config.shortpayTolerance,
      shortpayTriggered,
      steps: principalSteps,
    },
  };
}
