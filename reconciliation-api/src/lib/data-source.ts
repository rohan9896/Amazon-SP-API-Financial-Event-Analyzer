import {
  normalizeFinancialEvents,
  normalizeOrders,
  reconcile,
  SpApiClient,
  type ReconciliationConfig,
  type ReconciliationFinanceLine,
  type ReconciliationOrder,
  type ReconciliationRecord,
  type SpApiFetchedData,
} from 'reconciliation-engine';

import { env, toReconciliationConfig } from './env.js';

/** Anything that can fetch orders + finance events (the real SpApiClient, or a test stub). */
export type Fetcher = Pick<SpApiClient, 'fetchAll'>;

export type Dataset = {
  orders: ReconciliationOrder[];
  ordersWarnings: Record<string, string[]>;
  financeLines: ReconciliationFinanceLine[];
  report: ReconciliationRecord[];
  fetchedAt: number;
};

export type DataSource = {
  /** Return the cached dataset, refetching if the cache is stale or `force` is set. */
  getDataset(force?: boolean): Promise<Dataset>;
  /** Convenience: find a single reconciliation record by order id. */
  getRecord(orderId: string, force?: boolean): Promise<ReconciliationRecord | undefined>;
};

export type DataSourceDeps = {
  fetcher: Fetcher;
  config: ReconciliationConfig;
  createdAfter: string;
  ttlMs: number;
};

export function createDataSource(deps: DataSourceDeps): DataSource {
  let cache: Dataset | null = null;
  let inflight: Promise<Dataset> | null = null;

  async function build(): Promise<Dataset> {
    const data: SpApiFetchedData = await deps.fetcher.fetchAll(deps.createdAfter);
    const { orders, warningsByOrderId } = normalizeOrders(data.orders);
    const financeLines = normalizeFinancialEvents(data.financialEvents);
    const report = reconcile(orders, financeLines, deps.config, warningsByOrderId);

    return {
      orders,
      ordersWarnings: warningsByOrderId,
      financeLines,
      report,
      fetchedAt: Date.now(),
    };
  }

  function isFresh(): boolean {
    return cache !== null && Date.now() - cache.fetchedAt < deps.ttlMs;
  }

  async function getDataset(force = false): Promise<Dataset> {
    if (!force && isFresh()) {
      return cache as Dataset;
    }

    // Dedupe concurrent refreshes so a burst of requests triggers a single fetch.
    if (inflight) {
      return inflight;
    }

    inflight = build()
      .then((dataset) => {
        cache = dataset;
        return dataset;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  }

  async function getRecord(orderId: string, force = false) {
    const dataset = await getDataset(force);
    return dataset.report.find((record) => record.orderId === orderId);
  }

  return { getDataset, getRecord };
}

/** Default data source wired to the real mock SP-API client and env config. */
export const dataSource = createDataSource({
  fetcher: new SpApiClient({
    baseUrl: env.SP_API_BASE_URL,
    clientId: env.SP_API_CLIENT_ID,
    clientSecret: env.SP_API_CLIENT_SECRET,
  }),
  config: toReconciliationConfig(),
  createdAfter: env.CREATED_AFTER,
  ttlMs: env.DATA_CACHE_TTL_MS,
});
