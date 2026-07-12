import { Hono } from 'hono';

import type { ApiDeps } from './types.js';

export function ordersRoutes(deps: ApiDeps) {
  const router = new Hono();

  router.get('/', async (c) => {
    const dataset = await deps.dataSource.getDataset();
    return c.json({
      orders: dataset.orders,
      warnings: dataset.ordersWarnings,
    });
  });

  return router;
}
