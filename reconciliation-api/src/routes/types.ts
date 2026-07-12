import type { ExplanationProvider } from 'reconciliation-engine';

import type { DataSource } from '../lib/data-source.js';

/** Dependencies shared by the API route factories. Injectable for testing. */
export type ApiDeps = {
  dataSource: DataSource;
  /** Returns an explanation provider, or throws MissingApiKeyError when unconfigured. */
  getProvider: () => ExplanationProvider;
};
