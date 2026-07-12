import { writeFileSync } from 'node:fs';

import { SpApiClient } from '../client/sp-api-client.js';
import { reconcile } from '../engine/reconcile.js';
import { env, toReconciliationConfig } from '../lib/env.js';
import { normalizeFinancialEvents } from '../normalize/finances.js';
import { normalizeOrders } from '../normalize/orders.js';

function parseArgs(argv: string[]) {
  let createdAfter = env.CREATED_AFTER;
  let outputPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--created-after' && argv[i + 1]) {
      createdAfter = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--output' && argv[i + 1]) {
      outputPath = argv[i + 1];
      i += 1;
    }
  }

  return { createdAfter, outputPath };
}

async function main() {
  const { createdAfter, outputPath } = parseArgs(process.argv.slice(2));

  const client = new SpApiClient({
    baseUrl: env.SP_API_BASE_URL,
    clientId: env.SP_API_CLIENT_ID,
    clientSecret: env.SP_API_CLIENT_SECRET,
  });

  console.error(`Fetching orders since ${createdAfter} from ${env.SP_API_BASE_URL}...`);

  const data = await client.fetchAll(createdAfter);
  const { orders, warningsByOrderId } = normalizeOrders(data.orders);
  const financeLines = normalizeFinancialEvents(data.financialEvents);

  const report = reconcile(orders, financeLines, toReconciliationConfig(), warningsByOrderId);
  const json = JSON.stringify(report, null, 2);

  if (outputPath) {
    writeFileSync(outputPath, json, 'utf8');
    console.error(`Wrote reconciliation report to ${outputPath}`);
  } else {
    console.log(json);
  }

  const flagged = report.filter((record) => record.flags.length > 0);
  console.error(
    `Reconciled ${report.length} shipped orders. ${flagged.length} flagged.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
