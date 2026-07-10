import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

const exampleBodySchema = z.object({
  name: z.string().min(1),
  message: z.string().optional(),
});

export const exampleRoutes = new Hono();

exampleRoutes.get('/', (c) => {
  return c.json({
    message: 'Send a POST request with { "name": "...", "message": "..." }',
  });
});

exampleRoutes.post('/', zValidator('json', exampleBodySchema), (c) => {
  const body = c.req.valid('json');

  return c.json({
    received: body,
    greeting: `Hello, ${body.name}!`,
  });
});
