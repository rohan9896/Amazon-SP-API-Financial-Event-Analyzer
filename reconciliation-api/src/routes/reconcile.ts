import { Hono } from 'hono';

import type { ApiDeps } from './types.js';

export function reconcileRoutes(deps: ApiDeps) {
  const router = new Hono();

  router.get('/', async (c) => {
    // `?refresh=true` bypasses the cache and re-fetches from the mock SP-API.
    const refresh = c.req.query('refresh') === 'true';
    const dataset = await deps.dataSource.getDataset(refresh);
    return c.json(dataset.report);
  });

  return router;
}
