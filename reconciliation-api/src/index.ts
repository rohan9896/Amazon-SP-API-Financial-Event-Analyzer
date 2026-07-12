import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { dataSource } from './lib/data-source.js';
import { corsOrigins, env } from './lib/env.js';
import { getExplanationProvider } from './lib/explainer.js';

const app = createApp({
  deps: { dataSource, getProvider: getExplanationProvider },
  corsOrigin: corsOrigins(),
});

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`reconciliation-api running at http://localhost:${info.port}`);
    console.log(`Fetching from mock SP-API at ${env.SP_API_BASE_URL}`);
    if (!env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set — POST /api/explain/:orderId will return 503');
    }
  },
);
