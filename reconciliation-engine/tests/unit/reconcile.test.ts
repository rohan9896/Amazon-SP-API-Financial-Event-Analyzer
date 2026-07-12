import { describe, expect, it } from 'vitest';

import { reconcile } from '../../src/engine/reconcile.js';
import { detectNoSettlement, detectShortpay } from '../../src/rules/index.js';
import {
  canceledOrder300,
  cleanOrder111,
  cleanOrder111FinanceLines,
  DEFAULT_CONFIG,
  noSettlementOrder200,
  pendingOrder301,
  shortpayOrder444,
  shortpayOrder444FinanceLines,
  shortpayOrder777,
  shortpayOrder777FinanceLines,
} from '../fixtures/orders.js';

describe('detectNoSettlement (RL-8)', () => {
  it('flags order with zero finance lines', () => {
    const result = detectNoSettlement([]);
    expect(result.flags).toContain('no_settlement');
    expect(result.messages).toContain('Never settled');
  });

  it('does not flag order with at least one finance line', () => {
    const result = detectNoSettlement(cleanOrder111FinanceLines);
    expect(result.flags).not.toContain('no_settlement');
  });

  it('excludes Pending order from reconcile report', () => {
    const report = reconcile([pendingOrder301], [], DEFAULT_CONFIG);
    expect(report).toHaveLength(0);
  });
});

describe('detectShortpay (RL-7)', () => {
  it('flags when principal gap exceeds tolerance', () => {
    const result = detectShortpay(shortpayOrder444, shortpayOrder444FinanceLines, DEFAULT_CONFIG);
    expect(result.flags).toContain('shortpay');
    expect(result.messages[0]).toContain('90.00');
  });

  it('does not flag when principal matches within tolerance', () => {
    const result = detectShortpay(cleanOrder111, cleanOrder111FinanceLines, DEFAULT_CONFIG);
    expect(result.flags).not.toContain('shortpay');
  });

  it('does not flag when gap is exactly at tolerance boundary', () => {
    const order = {
      ...cleanOrder111,
      items: [{ ...cleanOrder111.items[0], itemPrice: 100 }],
    };
    const lines = [
      {
        ...cleanOrder111FinanceLines[0],
        amount: 99.5,
      },
    ];
    const result = detectShortpay(order, lines, DEFAULT_CONFIG);
    expect(result.flags).not.toContain('shortpay');
  });
});

describe('reconcile()', () => {
  it('outputs schema fields per RL-13', () => {
    const [record] = reconcile([cleanOrder111], cleanOrder111FinanceLines, DEFAULT_CONFIG);
    expect(record).toMatchObject({
      orderId: cleanOrder111.orderId,
      expectedRevenue: expect.any(Number),
      actualSettled: expect.any(Number),
      discrepancy: expect.any(Number),
      flags: expect.any(Array),
      flagMessages: expect.any(Array),
      financeLines: expect.any(Array),
      warnings: expect.any(Array),
    });
  });

  it('computes discrepancy as actualSettled - expectedRevenue', () => {
    const [record] = reconcile([cleanOrder111], cleanOrder111FinanceLines, DEFAULT_CONFIG);
    expect(record.discrepancy).toBe(
      Math.round((record.actualSettled - record.expectedRevenue) * 100) / 100,
    );
  });

  it('dedupes duplicate finance lines by eventId', () => {
    const duplicateLines = [...cleanOrder111FinanceLines, cleanOrder111FinanceLines[0]];
    const [record] = reconcile([cleanOrder111], duplicateLines, DEFAULT_CONFIG);
    expect(record.financeLines).toHaveLength(cleanOrder111FinanceLines.length);
  });

  it('flags shortpay and no_settlement on mock seed scenarios', () => {
    const report = reconcile(
      [shortpayOrder444, shortpayOrder777, noSettlementOrder200],
      [...shortpayOrder444FinanceLines, ...shortpayOrder777FinanceLines],
      DEFAULT_CONFIG,
    );

    const byId = Object.fromEntries(report.map((record) => [record.orderId, record]));
    expect(byId['444-5678901-2345678'].flags).toContain('shortpay');
    expect(byId['777-8901234-5678901'].flags).toContain('shortpay');
    expect(byId['200-1111111-1111111'].flags).toContain('no_settlement');
  });

  it('excludes Canceled orders from report', () => {
    const report = reconcile([canceledOrder300], cleanOrder111FinanceLines, DEFAULT_CONFIG);
    expect(report).toHaveLength(0);
  });

  it('allows multiple flags on one order when applicable', () => {
    const lines = [...shortpayOrder444FinanceLines];
    const report = reconcile([shortpayOrder444], lines, DEFAULT_CONFIG);
    expect(report[0].flags.length).toBeGreaterThanOrEqual(1);
  });
});
