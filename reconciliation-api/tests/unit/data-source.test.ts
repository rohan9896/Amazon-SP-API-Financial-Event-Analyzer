import type { SpApiFetchedData } from 'reconciliation-engine';
import { describe, expect, it, vi } from 'vitest';

import { createDataSource, type Fetcher } from '../../src/lib/data-source.js';

const fetched: SpApiFetchedData = {
  orders: [
    {
      AmazonOrderId: '444-5678901-2345678',
      OrderStatus: 'Shipped',
      MarketplaceId: 'ATVPDKIKX0DER',
      items: [
        {
          SellerSKU: 'ACCESSORY-004',
          QuantityOrdered: 1,
          ItemPrice: { CurrencyCode: 'USD', Amount: '119.97' },
          ItemTax: { CurrencyCode: 'USD', Amount: '0.00' },
          ShippingPrice: { CurrencyCode: 'USD', Amount: '0.00' },
        },
      ],
    },
  ],
  financialEvents: {},
};

function makeFetcher(): Fetcher & { fetchAll: ReturnType<typeof vi.fn> } {
  return { fetchAll: vi.fn().mockResolvedValue(fetched) };
}

const config = { commissionRate: 0.15, shortpayTolerance: 0.5 };

describe('createDataSource', () => {
  it('reconciles fetched data into a report', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 30_000 });

    const dataset = await ds.getDataset();

    expect(dataset.orders).toHaveLength(1);
    expect(dataset.report).toHaveLength(1);
    // No finance lines → no_settlement flag.
    expect(dataset.report[0].flags).toContain('no_settlement');
  });

  it('caches within the TTL (single fetch for repeated calls)', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 30_000 });

    await ds.getDataset();
    await ds.getDataset();
    await ds.getRecord('444-5678901-2345678');

    expect(fetcher.fetchAll).toHaveBeenCalledTimes(1);
  });

  it('refetches when forced', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 30_000 });

    await ds.getDataset();
    await ds.getDataset(true);

    expect(fetcher.fetchAll).toHaveBeenCalledTimes(2);
  });

  it('refetches once the TTL has elapsed', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 0 });

    await ds.getDataset();
    await ds.getDataset();

    expect(fetcher.fetchAll).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent refreshes into one fetch', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 30_000 });

    await Promise.all([ds.getDataset(), ds.getDataset(), ds.getDataset()]);

    expect(fetcher.fetchAll).toHaveBeenCalledTimes(1);
  });

  it('getRecord returns undefined for an unknown order', async () => {
    const fetcher = makeFetcher();
    const ds = createDataSource({ fetcher, config, createdAfter: '2020-01-01', ttlMs: 30_000 });

    expect(await ds.getRecord('does-not-exist')).toBeUndefined();
  });
});
