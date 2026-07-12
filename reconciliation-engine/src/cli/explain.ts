import { readFileSync, writeFileSync } from 'node:fs';

import type { ReconciliationRecord } from '../domain/types.js';
import { explainReport } from '../explain/explain.js';
import { GeminiClient } from '../explain/gemini-client.js';
import { requireGeminiConfig } from '../lib/env.js';

type Args = {
  input: string;
  output?: string;
  order?: string;
  all: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { input: 'report.json', all: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
    } else if (arg === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
    } else if (arg === '--order' && argv[i + 1]) {
      args.order = argv[i + 1];
      i += 1;
    } else if (arg === '--all') {
      args.all = true;
    }
  }

  return args;
}

function loadReport(path: string): ReconciliationRecord[] {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Could not read report file at "${path}". Run \`pnpm reconcile -- --output ${path}\` first.`);
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected "${path}" to contain a reconciliation report array.`);
  }
  return parsed as ReconciliationRecord[];
}

function selectRecords(records: ReconciliationRecord[], args: Args): ReconciliationRecord[] {
  if (args.order) {
    const match = records.filter((record) => record.orderId === args.order);
    if (match.length === 0) {
      throw new Error(`Order "${args.order}" not found in the report.`);
    }
    return match;
  }

  if (args.all) {
    return records;
  }

  return records.filter((record) => record.flags.length > 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { apiKey, model } = requireGeminiConfig();

  const records = loadReport(args.input);
  const selected = selectRecords(records, args);

  if (selected.length === 0) {
    console.error('No matching orders to explain (no flagged orders — use --all to include clean ones).');
    return;
  }

  console.error(`Explaining ${selected.length} order(s) with ${model}...`);

  const client = new GeminiClient({ apiKey, model });
  const explanations = await explainReport(selected, client);

  const json = JSON.stringify(explanations, null, 2);

  if (args.output) {
    writeFileSync(args.output, json, 'utf8');
    console.error(`Wrote ${explanations.length} explanation(s) to ${args.output}`);
  } else {
    console.log(json);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
