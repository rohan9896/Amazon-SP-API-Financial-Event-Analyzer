import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { errorHandler } from './middlewares/error-handler.js';
import { authRoutes } from './routes/auth.js';
import { exampleRoutes } from './routes/example.js';
import { healthRoutes } from './routes/health.js';

export const app = new Hono();

app.use('*', logger());
app.onError(errorHandler);

app.route('/auth', authRoutes);
app.route('/health', healthRoutes);
app.route('/example', exampleRoutes);

app.get('/', (c) => {
  return c.json({
    service: 'sp-api-service',
    status: 'running',
  });
});
