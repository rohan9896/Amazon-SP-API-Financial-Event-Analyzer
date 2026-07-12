import { Hono } from 'hono';
import { z } from 'zod';

import { getAccessToken } from '../auth/tokens.js';
import { env } from '../lib/env.js';
import { createRateLimiter } from '../lib/rate-limiter.js';
import {
  OrderNotFoundError,
  OrdersServiceError,
  getOrderItems,
  listOrders,
} from '../services/orders.js';

const listOrdersQuerySchema = z.object({
  CreatedAfter: z.string(),
  CreatedBefore: z.string().optional(),
  OrderStatuses: z.string().optional(),
  MarketplaceIds: z.string().optional(),
  MaxResultsPerPage: z.coerce.number().int().min(1).max(100).default(100),
  NextToken: z.string().optional(),
});

const orderItemsQuerySchema = z.object({
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

function notFound(message: string) {
  return {
    errors: [
      {
        code: 'NotFound',
        message,
      },
    ],
  };
}

function tooManyRequests() {
  return {
    errors: [
      {
        code: 'TooManyRequests',
        message: 'Rate limit exceeded',
      },
    ],
  };
}

// Shared across both endpoints, matching Amazon's per-application throttling behavior.
const checkRateLimit = createRateLimiter(
  env.ORDERS_RATE_LIMIT_THRESHOLD,
  env.ORDERS_RATE_LIMIT_WINDOW_MS,
);

export const ordersRoutes = new Hono();

ordersRoutes.get('/v0/orders', (c) => {
  const token = c.req.header('x-amz-access-token');
  if (!token || !getAccessToken(token)) {
    return c.json(unauthorized(), 403);
  }

  if (!checkRateLimit()) {
    return c.json(tooManyRequests(), 429);
  }

  const parsed = listOrdersQuerySchema.safeParse({
    CreatedAfter: c.req.query('CreatedAfter'),
    CreatedBefore: c.req.query('CreatedBefore'),
    OrderStatuses: c.req.query('OrderStatuses'),
    MarketplaceIds: c.req.query('MarketplaceIds'),
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

  const { CreatedAfter, CreatedBefore, OrderStatuses, MarketplaceIds, MaxResultsPerPage, NextToken } =
    parsed.data;

  try {
    const response = listOrders({
      CreatedAfter,
      CreatedBefore,
      OrderStatuses: OrderStatuses?.split(',').map((s) => s.trim()) as never,
      MarketplaceIds: MarketplaceIds?.split(',').map((s) => s.trim()),
      MaxResultsPerPage,
      NextToken,
    });
    c.header('x-amzn-RateLimit-Limit', String(env.ORDERS_RATE_LIMIT_THRESHOLD));
    c.header('x-amzn-RequestId', crypto.randomUUID());
    return c.json(response);
  } catch (error) {
    if (error instanceof OrdersServiceError) {
      return c.json(invalidInput(error.message, error.details), 400);
    }
    throw error;
  }
});

ordersRoutes.get('/v0/orders/:orderId/orderItems', (c) => {
  const token = c.req.header('x-amz-access-token');
  if (!token || !getAccessToken(token)) {
    return c.json(unauthorized(), 403);
  }

  if (!checkRateLimit()) {
    return c.json(tooManyRequests(), 429);
  }

  const orderId = c.req.param('orderId');

  const parsed = orderItemsQuerySchema.safeParse({
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
    const response = getOrderItems(orderId, parsed.data.MaxResultsPerPage, parsed.data.NextToken);
    c.header('x-amzn-RateLimit-Limit', String(env.ORDERS_RATE_LIMIT_THRESHOLD));
    c.header('x-amzn-RequestId', crypto.randomUUID());
    return c.json(response);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return c.json(notFound(error.message), 404);
    }
    if (error instanceof OrdersServiceError) {
      return c.json(invalidInput(error.message, error.details), 400);
    }
    throw error;
  }
});
