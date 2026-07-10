import { Hono } from 'hono';
import { z } from 'zod';

import {
  isValidRefreshToken,
  issueAccessToken,
  validateClientCredentials,
} from '../auth/tokens.js';

const tokenRequestSchema = z.object({
  grant_type: z.enum(['client_credentials', 'refresh_token']).default('client_credentials'),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  refresh_token: z.string().optional(),
});

async function parseTokenBody(c: {
  req: {
    header: (name: string) => string | undefined;
    parseBody: () => Promise<Record<string, string | File>>;
    json: () => Promise<unknown>;
  };
}): Promise<unknown> {
  const contentType = c.req.header('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await c.req.parseBody();
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
    return result;
  }

  return c.req.json();
}

export const authRoutes = new Hono();

authRoutes.post('/o2/token', async (c) => {
  let rawBody: unknown;

  try {
    rawBody = await parseTokenBody(c);
  } catch {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Request body could not be parsed',
      },
      400,
    );
  }

  const parsed = tokenRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing or invalid token request parameters',
      },
      400,
    );
  }

  const { grant_type, client_id, client_secret, refresh_token } = parsed.data;

  if (!validateClientCredentials(client_id, client_secret)) {
    return c.json(
      {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      },
      401,
    );
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token || !isValidRefreshToken(refresh_token)) {
      return c.json(
        {
          error: 'invalid_grant',
          error_description: 'Refresh token is invalid',
        },
        400,
      );
    }
  }

  return c.json(issueAccessToken());
});
