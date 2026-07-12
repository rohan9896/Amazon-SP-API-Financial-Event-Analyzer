import type {
  GetOrderItemsResponse,
  GetOrdersResponse,
  ListOrdersQuery,
  Order,
  OrderItemsPaginationToken,
  OrdersPaginationToken,
} from '../domain/orders.js';
import { SEED_ORDERS } from '../data/orders.js';

export class OrdersServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'OrdersServiceError';
  }
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} does not exist`);
    this.name = 'OrderNotFoundError';
  }
}

function parseIsoDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new OrdersServiceError(
      'InvalidInput',
      `Invalid date format for ${field}`,
      `${field} must be ISO 8601 date-time`,
    );
  }
  return date;
}

function encodeToken(token: object): string {
  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

function decodeToken<T>(token: string): T {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as T;
  } catch {
    throw new OrdersServiceError(
      'InvalidInput',
      'NextToken is invalid',
      'The provided NextToken could not be parsed',
    );
  }
}

function toOrder(seedOrder: (typeof SEED_ORDERS)[number]): Order {
  const { items, ...order } = seedOrder;
  void items;
  return order;
}

function filterOrders(query: {
  createdAfter: string;
  createdBefore?: string;
  orderStatuses?: string[];
  marketplaceIds?: string[];
}): (typeof SEED_ORDERS)[number][] {
  const afterDate = parseIsoDate(query.createdAfter, 'CreatedAfter');
  const beforeDate = query.createdBefore ? parseIsoDate(query.createdBefore, 'CreatedBefore') : null;

  if (beforeDate && beforeDate <= afterDate) {
    throw new OrdersServiceError('InvalidInput', 'CreatedBefore must be later than CreatedAfter');
  }

  return SEED_ORDERS.filter((order) => {
    const purchaseDate = new Date(order.PurchaseDate);

    if (purchaseDate < afterDate) {
      return false;
    }

    if (beforeDate && purchaseDate >= beforeDate) {
      return false;
    }

    if (query.orderStatuses && !query.orderStatuses.includes(order.OrderStatus)) {
      return false;
    }

    if (query.marketplaceIds && !query.marketplaceIds.includes(order.MarketplaceId)) {
      return false;
    }

    return true;
  }).sort((a, b) => a.PurchaseDate.localeCompare(b.PurchaseDate));
}

export function listOrders(query: ListOrdersQuery): GetOrdersResponse {
  let offset = 0;
  let createdAfter = query.CreatedAfter;
  let createdBefore = query.CreatedBefore;
  let orderStatuses = query.OrderStatuses;
  let marketplaceIds = query.MarketplaceIds;
  const maxResults = query.MaxResultsPerPage;

  if (query.NextToken) {
    const token = decodeToken<OrdersPaginationToken>(query.NextToken);
    offset = token.o;
    createdAfter = token.ca;
    createdBefore = token.cb;
    orderStatuses = token.st;
    marketplaceIds = token.mp;

    if (token.m !== maxResults) {
      throw new OrdersServiceError(
        'InvalidInput',
        'MaxResultsPerPage must match the original request when using NextToken',
      );
    }
  }

  const filtered = filterOrders({
    createdAfter,
    createdBefore,
    orderStatuses,
    marketplaceIds,
  });

  const page = filtered.slice(offset, offset + maxResults);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < filtered.length;

  const payload: GetOrdersResponse['payload'] = {
    Orders: page.map(toOrder),
  };

  if (hasMore) {
    payload.NextToken = encodeToken({
      o: nextOffset,
      ca: createdAfter,
      cb: createdBefore,
      st: orderStatuses,
      mp: marketplaceIds,
      m: maxResults,
    } satisfies OrdersPaginationToken);
  }

  return { payload };
}

export function getOrderItems(
  orderId: string,
  maxResultsPerPage: number,
  nextToken?: string,
): GetOrderItemsResponse {
  const seedOrder = SEED_ORDERS.find((order) => order.AmazonOrderId === orderId);

  if (!seedOrder) {
    throw new OrderNotFoundError(orderId);
  }

  let offset = 0;

  if (nextToken) {
    const token = decodeToken<OrderItemsPaginationToken>(nextToken);
    offset = token.o;

    if (token.m !== maxResultsPerPage) {
      throw new OrdersServiceError(
        'InvalidInput',
        'MaxResultsPerPage must match the original request when using NextToken',
      );
    }
  }

  // Real Amazon getOrderItems omits pricing/tax/shipping fields for Pending orders,
  // since payment has not yet been authorized.
  const isPending = seedOrder.OrderStatus === 'Pending';
  const items = seedOrder.items.map((item) => {
    if (!isPending) {
      return item;
    }
    const { ItemPrice, ShippingPrice, ItemTax, ...rest } = item;
    void ItemPrice;
    void ShippingPrice;
    void ItemTax;
    return rest;
  });

  const page = items.slice(offset, offset + maxResultsPerPage);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < items.length;

  const payload: GetOrderItemsResponse['payload'] = {
    AmazonOrderId: orderId,
    OrderItems: page,
  };

  if (hasMore) {
    payload.NextToken = encodeToken({
      o: nextOffset,
      m: maxResultsPerPage,
    } satisfies OrderItemsPaginationToken);
  }

  return { payload };
}
