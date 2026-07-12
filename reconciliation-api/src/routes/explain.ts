import { explainRecord } from 'reconciliation-engine';
import { Hono } from 'hono';

import { toReconciliationConfig } from '../lib/env.js';
import { MissingApiKeyError } from '../lib/explainer.js';
import type { ApiDeps } from './types.js';

export function explainRoutes(deps: ApiDeps) {
  const router = new Hono();

  // POST because each call triggers a paid, slow external LLM request.
  router.post('/:orderId', async (c) => {
    const orderId = c.req.param('orderId');
    const dataset = await deps.dataSource.getDataset();
    const record = dataset.report.find((r) => r.orderId === orderId);

    if (!record) {
      return c.json({ error: `Order ${orderId} not found in the reconciliation report` }, 404);
    }

    const order = dataset.orders.find((o) => o.orderId === orderId);

    let provider;
    try {
      provider = deps.getProvider();
    } catch (error) {
      if (error instanceof MissingApiKeyError) {
        return c.json(
          { error: 'Explanations unavailable: GEMINI_API_KEY is not configured on the server' },
          503,
        );
      }
      throw error;
    }

    try {
      const explanation = await explainRecord(record, provider, {
        order,
        config: toReconciliationConfig(),
      });
      return c.json(explanation);
    } catch (error) {
      // No fallback: surface the LLM failure loudly.
      return c.json(
        {
          error: 'Failed to generate explanation',
          detail: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  return router;
}
