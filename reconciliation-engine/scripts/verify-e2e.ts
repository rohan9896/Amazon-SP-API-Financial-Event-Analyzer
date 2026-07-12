import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from 'dotenv';

const localEnv = resolve(process.cwd(), '.env');
const sharedEnv = resolve(process.cwd(), '../sp-api-service/.env');

if (existsSync(localEnv)) {
  config({ path: localEnv, quiet: true });
} else if (existsSync(sharedEnv)) {
  config({ path: sharedEnv, quiet: true });
  process.env.SP_API_CLIENT_ID = process.env.CLIENT_ID;
  process.env.SP_API_CLIENT_SECRET = process.env.CLIENT_SECRET;
}

const result = spawnSync('pnpm', ['exec', 'tsx', 'src/cli/run.ts'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
});

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  console.error('reconcile CLI failed');
  process.exit(result.status ?? 1);
}

const start = result.stdout.indexOf('[');
const end = result.stdout.lastIndexOf(']');
if (start === -1 || end === -1) {
  console.error('Could not find JSON array in CLI output:\n', result.stdout);
  process.exit(1);
}

const report = JSON.parse(result.stdout.slice(start, end + 1)) as {
  orderId: string;
  flags: string[];
}[];
const byId = Object.fromEntries(report.map((record) => [record.orderId, record]));

const checks: [string, boolean][] = [
  ['report count', report.length === 11],
  ['444 shortpay', byId['444-5678901-2345678']?.flags.includes('shortpay') ?? false],
  ['777 shortpay', byId['777-8901234-5678901']?.flags.includes('shortpay') ?? false],
  ['200 no_settlement', byId['200-1111111-1111111']?.flags.includes('no_settlement') ?? false],
  ['201 no_settlement', byId['201-2222222-2222222']?.flags.includes('no_settlement') ?? false],
  ['111 clean', (byId['111-2345678-9012345']?.flags.length ?? -1) === 0],
  ['300 absent', !byId['300-3333333-3333333']],
  ['301 absent', !byId['301-4444444-4444444']],
];

for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
}

if (checks.some(([, pass]) => !pass)) {
  process.exit(1);
}
