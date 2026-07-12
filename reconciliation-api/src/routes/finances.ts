import { Hono } from 'hono';

import type { ApiDeps } from './types.js';

export function financesRoutes(deps: ApiDeps) {
  const router = new Hono();

  router.get('/', async (c) => {
    const dataset = await deps.dataSource.getDataset();
    return c.json({ financeLines: dataset.financeLines });
  });

  return router;
}
