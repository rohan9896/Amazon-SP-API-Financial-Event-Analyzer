import type {
  ReconciliationRecord,
  SellerExplanationBody,
} from 'reconciliation-engine';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { Dataset, DataSource } from '../../src/lib/data-source.js';
import { MissingApiKeyError } from '../../src/lib/explainer.js';
import type { ApiDeps } from '../../src/routes/types.js';

const record: ReconciliationRecord = {
  orderId: '444-5678901-2345678',
  expectedRevenue: 101.97,
  actualSettled: -9,
  discrepancy: -110.97,
  flags: ['shortpay'],
  flagMessages: ['Underpaid by $90.00'],
  financeLines: [],
  warnings: [],
};

const dataset: Dataset = {
  orders: [],
  ordersWarnings: {},
  financeLines: [],
  report: [record],
  fetchedAt: Date.now(),
};

const validBody: SellerExplanationBody = {
  headline: 'Underpaid by $90.00 on product principal',
  summary: 'You expected $101.97 but -$9.00 settled.',
  reason: 'Principal settled below expected.',
  evidence: ['Principal $29.97'],
  recommendedAction: 'Open a case with Amazon.',
  confidence: 'high',
};

function makeDataSource(): DataSource {
  return {
    getDataset: async () => dataset,
    getRecord: async (orderId) => dataset.report.find((r) => r.orderId === orderId),
  };
}

function makeApp(overrides: Partial<ApiDeps> = {}) {
  const deps: ApiDeps = {
    dataSource: makeDataSource(),
    getProvider: () => ({ generate: vi.fn().mockResolvedValue(validBody) }),
    ...overrides,
  };
  return createApp({ deps, corsOrigin: '*' });
}

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await makeApp().request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });
});

describe('GET /api/reconcile', () => {
  it('returns the report array', async () => {
    const res = await makeApp().request('/api/reconcile');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].orderId).toBe('444-5678901-2345678');
  });
});

describe('POST /api/explain/:orderId', () => {
  it('returns an explanation for a known order', async () => {
    const res = await makeApp().request('/api/explain/444-5678901-2345678', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orderId).toBe('444-5678901-2345678');
    expect(body.headline).toBe(validBody.headline);
    expect(body.calculation).toBeDefined();
    expect(body.calculation.formulas.discrepancy).toContain('actualSettled');
    expect(body.calculation.discrepancy.value).toBe(-110.97);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await makeApp().request('/api/explain/999-0000000-0000000', { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('returns 503 when the Gemini key is not configured', async () => {
    const app = makeApp({
      getProvider: () => {
        throw new MissingApiKeyError();
      },
    });
    const res = await app.request('/api/explain/444-5678901-2345678', { method: 'POST' });
    expect(res.status).toBe(503);
  });

  it('returns 502 when the LLM call fails (no fallback)', async () => {
    const app = makeApp({
      getProvider: () => ({ generate: vi.fn().mockRejectedValue(new Error('quota exceeded')) }),
    });
    const res = await app.request('/api/explain/444-5678901-2345678', { method: 'POST' });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'Failed to generate explanation' });
  });
});
