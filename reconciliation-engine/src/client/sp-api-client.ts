const MAX_RETRIES = 6;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 12000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute how long to wait before retrying a 429. Prefer the server's `Retry-After`
 * header (seconds) when present — the mock returns the exact time until a rate-limit slot
 * frees — otherwise fall back to capped exponential backoff. A small jitter avoids
 * retrying at the precise instant the window rolls over.
 */
function computeBackoffMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  const jitter = Math.floor(Math.random() * 250);

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000 + 250 + jitter;
    }
  }

  return Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS) + jitter;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

type GetOrdersResponse = {
  payload: {
    Orders: {
      AmazonOrderId: string;
      OrderStatus: string;
      MarketplaceId: string;
    }[];
    NextToken?: string;
  };
};

type GetOrderItemsResponse = {
  payload: {
    AmazonOrderId: string;
    OrderItems: {
      ASIN?: string;
      SellerSKU?: string;
      OrderItemId?: string;
      Title?: string;
      QuantityOrdered?: number;
      QuantityShipped?: number;
      ItemPrice?: { CurrencyCode?: string; Amount?: string };
      ShippingPrice?: { CurrencyCode?: string; Amount?: string };
      ItemTax?: { CurrencyCode?: string; Amount?: string };
    }[];
    NextToken?: string;
  };
};

type GetFinancialEventsResponse = {
  payload: {
    FinancialEvents: Record<string, unknown>;
    NextToken?: string;
  };
};

export type SpApiClientConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

export type SpApiFetchedData = {
  orders: {
    AmazonOrderId: string;
    OrderStatus: string;
    MarketplaceId: string;
    items: GetOrderItemsResponse['payload']['OrderItems'];
  }[];
  financialEvents: Record<string, unknown>;
};

export class SpApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: SpApiClientConfig) {}

  async fetchAll(createdAfter: string): Promise<SpApiFetchedData> {
    await this.ensureToken();

    const orders = await this.fetchAllOrders(createdAfter);
    const ordersWithItems = await this.fetchOrderItemsForAll(orders);
    const financialEvents = await this.fetchAllFinancialEvents();

    return {
      orders: ordersWithItems,
      financialEvents,
    };
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return;
    }

    const response = await this.request<TokenResponse>('/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      skipAuth: true,
    });

    this.accessToken = response.access_token;
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000 - 30_000;
  }

  private async fetchAllOrders(createdAfter: string) {
    const orders: GetOrdersResponse['payload']['Orders'] = [];
    let nextToken: string | undefined;

    do {
      const params = new URLSearchParams({
        CreatedAfter: createdAfter,
        OrderStatuses: 'Shipped',
        MaxResultsPerPage: '100',
      });

      if (nextToken) {
        params.set('NextToken', nextToken);
      }

      const response = await this.request<GetOrdersResponse>(
        `/orders/v0/orders?${params.toString()}`,
      );

      orders.push(...response.payload.Orders);
      nextToken = response.payload.NextToken;
    } while (nextToken);

    return orders;
  }

  private async fetchOrderItemsForAll(
    orders: GetOrdersResponse['payload']['Orders'],
  ): Promise<SpApiFetchedData['orders']> {
    const result: SpApiFetchedData['orders'] = [];

    for (const order of orders) {
      const items: GetOrderItemsResponse['payload']['OrderItems'] = [];
      let nextToken: string | undefined;

      do {
        const params = new URLSearchParams({ MaxResultsPerPage: '100' });
        if (nextToken) {
          params.set('NextToken', nextToken);
        }

        const response = await this.request<GetOrderItemsResponse>(
          `/orders/v0/orders/${encodeURIComponent(order.AmazonOrderId)}/orderItems?${params.toString()}`,
        );

        items.push(...response.payload.OrderItems);
        nextToken = response.payload.NextToken;
      } while (nextToken);

      result.push({
        AmazonOrderId: order.AmazonOrderId,
        OrderStatus: order.OrderStatus,
        MarketplaceId: order.MarketplaceId,
        items,
      });
    }

    return result;
  }

  private async fetchAllFinancialEvents(): Promise<Record<string, unknown>> {
    const merged: Record<string, unknown[]> = {};
    let nextToken: string | undefined;

    do {
      const params = new URLSearchParams({ MaxResultsPerPage: '100' });
      if (nextToken) {
        params.set('NextToken', nextToken);
      }

      const response = await this.request<GetFinancialEventsResponse>(
        `/finances/v0/financialEvents?${params.toString()}`,
      );

      for (const [key, value] of Object.entries(response.payload.FinancialEvents)) {
        if (!Array.isArray(value)) {
          continue;
        }
        const existing = (merged[key] as unknown[]) ?? [];
        merged[key] = [...existing, ...value];
      }

      nextToken = response.payload.NextToken;
    } while (nextToken);

    return merged;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { skipAuth?: boolean } = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      const headers = new Headers(init.headers);

      if (!init.skipAuth && this.accessToken) {
        headers.set('x-amz-access-token', this.accessToken);
      }

      const response = await fetch(url, { ...init, headers });

      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        const backoff = computeBackoffMs(response, attempt);
        await sleep(backoff);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`SP-API request failed (${response.status}) ${path}: ${body}`);
      }

      return (await response.json()) as T;
    }

    throw new Error(`SP-API request failed after retries: ${path}`);
  }
}
