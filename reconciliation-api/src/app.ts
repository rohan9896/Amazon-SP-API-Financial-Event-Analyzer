import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { errorHandler } from './middlewares/error-handler.js';
import { financesRoutes } from './routes/finances.js';
import { healthRoutes } from './routes/health.js';
import { ordersRoutes } from './routes/orders.js';
import { reconcileRoutes } from './routes/reconcile.js';
import { explainRoutes } from './routes/explain.js';
import type { ApiDeps } from './routes/types.js';

export type CreateAppOptions = {
  deps: ApiDeps;
  corsOrigin: string | string[];
};

export function createApp({ deps, corsOrigin }: CreateAppOptions) {
  const app = new Hono();

  app.use('*', logger());
  app.use('/api/*', cors({ origin: corsOrigin }));
  app.onError(errorHandler);

  app.route('/health', healthRoutes);
  app.route('/api/orders', ordersRoutes(deps));
  app.route('/api/finances', financesRoutes(deps));
  app.route('/api/reconcile', reconcileRoutes(deps));
  app.route('/api/explain', explainRoutes(deps));

  app.get('/', (c) =>
    c.json({
      service: 'reconciliation-api',
      status: 'running',
      endpoints: [
        'GET /health',
        'GET /api/orders',
        'GET /api/finances',
        'GET /api/reconcile',
        'POST /api/explain/:orderId',
      ],
    }),
  );

  return app;
}
