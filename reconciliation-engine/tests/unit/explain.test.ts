import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReconciliationOrder, ReconciliationRecord } from '../../src/domain/types.js';
import { buildCalculationBreakdown } from '../../src/explain/breakdown.js';
import { buildExplanationContext } from '../../src/explain/context.js';
import { explainRecord, explainReport } from '../../src/explain/explain.js';
import { GeminiClient } from '../../src/explain/gemini-client.js';
import type { ExplanationProvider, SellerExplanationBody } from '../../src/explain/types.js';

const order: ReconciliationOrder = {
  orderId: '444-5678901-2345678',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'ACCESSORY-004',
      quantityOrdered: 1,
      itemPrice: 119.97,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

const record: ReconciliationRecord = {
  orderId: '444-5678901-2345678',
  expectedRevenue: 101.97,
  actualSettled: -9,
  discrepancy: -110.97,
  flags: ['shortpay'],
  flagMessages: ['Underpaid by $90.00'],
  financeLines: [
    {
      eventId: 'ShipmentEventList:2026-06-07:444-5678901-2345678:Principal:0',
      orderId: '444-5678901-2345678',
      sellerSKU: 'ACCESSORY-004',
      eventCategory: 'ShipmentEventList',
      lineType: 'Principal',
      amount: 29.97,
      currency: 'USD',
      postedDate: '2026-06-07T16:45:00.000Z',
    },
    {
      eventId: 'ShipmentEventList:2026-06-07:444-5678901-2345678:Commission:0',
      orderId: '444-5678901-2345678',
      sellerSKU: 'ACCESSORY-004',
      eventCategory: 'ShipmentEventList',
      lineType: 'Commission',
      amount: -4.5,
      currency: 'USD',
      postedDate: '2026-06-07T16:45:00.000Z',
    },
    {
      eventId: 'ChargebackEventList:2026-06-10:444-5678901-2345678:Chargeback:0',
      orderId: '444-5678901-2345678',
      eventCategory: 'ChargebackEventList',
      lineType: 'Chargeback',
      amount: -29.97,
      currency: 'USD',
      postedDate: '2026-06-10T13:30:00.000Z',
    },
  ],
  warnings: [],
};

const validBody: SellerExplanationBody = {
  headline: 'Underpaid by $90.00 on product principal',
  summary: 'You expected $101.97 but only $-9.00 settled.',
  reason: 'The shipment principal was $29.97 vs an expected $119.97.',
  evidence: ['Principal $29.97'],
  recommendedAction: 'Open a case citing the $90.00 principal shortfall.',
  confidence: 'high',
};

describe('buildCalculationBreakdown', () => {
  it('itemizes expected revenue and actual settlement with formulas', () => {
    const calc = buildCalculationBreakdown(record, order, {
      commissionRate: 0.15,
      shortpayTolerance: 0.5,
    });

    expect(calc.formulas.expectedRevenue).toContain('itemSubtotal');
    expect(calc.expected.itemSubtotal).toBe(119.97);
    expect(calc.expected.commissionFee).toBe(18);
    expect(calc.expected.expectedRevenue).toBe(101.97);
    expect(calc.actual.actualSettled).toBe(-9);
    expect(calc.actual.lines).toHaveLength(3);
    expect(calc.discrepancy.value).toBe(-110.97);
    expect(calc.discrepancy.meaning).toBe('underpaid');
    expect(calc.principal.expectedPrincipal).toBe(119.97);
    expect(calc.principal.actualPrincipal).toBe(29.97);
    expect(calc.principal.principalGap).toBe(-90);
    expect(calc.principal.shortpayTriggered).toBe(true);
  });
});

describe('buildExplanationContext', () => {
  it('includes the record numbers, flags, and calculation in the prompt', () => {
    const calculation = buildCalculationBreakdown(record, order);
    const { systemInstruction, userPrompt } = buildExplanationContext(record, calculation);

    expect(userPrompt).toContain('444-5678901-2345678');
    expect(userPrompt).toContain('-110.97');
    expect(userPrompt).toContain('shortpay');
    expect(userPrompt).toContain('expectedRevenue');
    expect(userPrompt).toContain('principalGap');
    expect(systemInstruction).toContain('NEVER do arithmetic');
  });

  it('does not leak credentials', () => {
    const calculation = buildCalculationBreakdown(record, order);
    const { userPrompt } = buildExplanationContext(record, calculation);
    expect(userPrompt).not.toContain('API_KEY');
  });
});

describe('explainRecord / explainReport', () => {
  it('attaches orderId and deterministic calculation', async () => {
    const provider: ExplanationProvider = { generate: vi.fn().mockResolvedValue(validBody) };

    const result = await explainRecord(record, provider, { order });

    expect(result.orderId).toBe('444-5678901-2345678');
    expect(result.headline).toBe(validBody.headline);
    expect(result.calculation.discrepancy.value).toBe(-110.97);
    expect(result.calculation.principal.principalGap).toBe(-90);
  });

  it('explains records sequentially', async () => {
    const provider: ExplanationProvider = { generate: vi.fn().mockResolvedValue(validBody) };

    const results = await explainReport([record, { ...record, orderId: '777' }], provider);

    expect(results).toHaveLength(2);
    expect(results[1].orderId).toBe('777');
    expect(results[1].calculation).toBeDefined();
  });

  it('propagates provider failures (no fallback)', async () => {
    const provider: ExplanationProvider = {
      generate: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    };

    await expect(explainRecord(record, provider)).rejects.toThrow('quota exceeded');
  });
});

describe('GeminiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json: async () => response.jsonBody ?? {},
        text: async () => response.textBody ?? '',
      }),
    );
  }

  const context = buildExplanationContext(record, buildCalculationBreakdown(record, order));

  it('parses a well-formed structured response', async () => {
    mockFetchOnce({
      jsonBody: {
        candidates: [{ content: { parts: [{ text: JSON.stringify(validBody) }] } }],
      },
    });

    const client = new GeminiClient({ apiKey: 'k', model: 'gemini-3.1-flash-lite' });
    const body = await client.generate(context);

    expect(body.confidence).toBe('high');
  });

  it('throws on a non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 429, textBody: 'rate limited' });

    const client = new GeminiClient({ apiKey: 'k', model: 'gemini-3.1-flash-lite' });
    await expect(client.generate(context)).rejects.toThrow('Gemini request failed (429)');
  });

  it('throws when the model returns invalid JSON', async () => {
    mockFetchOnce({
      jsonBody: { candidates: [{ content: { parts: [{ text: 'not json' }] } }] },
    });

    const client = new GeminiClient({ apiKey: 'k', model: 'gemini-3.1-flash-lite' });
    await expect(client.generate(context)).rejects.toThrow('non-JSON output');
  });

  it('throws when the response fails schema validation', async () => {
    mockFetchOnce({
      jsonBody: {
        candidates: [
          { content: { parts: [{ text: JSON.stringify({ ...validBody, confidence: 'certain' }) }] } },
        ],
      },
    });

    const client = new GeminiClient({ apiKey: 'k', model: 'gemini-3.1-flash-lite' });
    await expect(client.generate(context)).rejects.toThrow('did not match the expected schema');
  });
});
