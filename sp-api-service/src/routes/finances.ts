import { Hono } from 'hono';
import { z } from 'zod';

import { getAccessToken } from '../auth/tokens.js';
import {
  FinancialEventsServiceError,
  listFinancialEvents,
} from '../services/financial-events.js';

const querySchema = z.object({
  PostedAfter: z.string().optional(),
  PostedBefore: z.string().optional(),
  MaxResultsPerPage: z.coerce.number().int().min(1).max(100).default(100),
  NextToken: z.string().optional(),
});

function unauthorized() {
  return {
    errors: [
      {
        code: 'Unauthorized',
        message: 'Access to requested resource is denied.',
      },
    ],
  };
}

function invalidInput(message: string, details?: string) {
  return {
    errors: [
      {
        code: 'InvalidInput',
        message,
        ...(details ? { details } : {}),
      },
    ],
  };
}

export const financesRoutes = new Hono();

financesRoutes.get('/v0/financialEvents', (c) => {
  const token = c.req.header('x-amz-access-token');
  if (!token || !getAccessToken(token)) {
    return c.json(unauthorized(), 403);
  }

  const parsed = querySchema.safeParse({
    PostedAfter: c.req.query('PostedAfter'),
    PostedBefore: c.req.query('PostedBefore'),
    MaxResultsPerPage: c.req.query('MaxResultsPerPage') ?? '100',
    NextToken: c.req.query('NextToken'),
  });

  if (!parsed.success) {
    return c.json(
      invalidInput(
        'Request has missing or invalid parameters and cannot be parsed.',
        parsed.error.message,
      ),
      400,
    );
  }

  try {
    const response = listFinancialEvents(parsed.data);
    c.header('x-amzn-RateLimit-Limit', '0.5');
    c.header('x-amzn-RequestId', crypto.randomUUID());
    return c.json(response);
  } catch (error) {
    if (error instanceof FinancialEventsServiceError) {
      return c.json(invalidInput(error.message, error.details), 400);
    }
    throw error;
  }
});
