import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

import { DEFAULT_RECONCILIATION_CONFIG } from '../domain/types.js';

const cwd = process.cwd();
for (const envPath of [resolve(cwd, '.env'), resolve(cwd, '../sp-api-service/.env')]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, quiet: true });
    break;
  }
}

const envSchema = z.object({
  SP_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  SP_API_CLIENT_ID: z.string().min(1).optional(),
  SP_API_CLIENT_SECRET: z.string().min(1).optional(),
  CLIENT_ID: z.string().min(1).optional(),
  CLIENT_SECRET: z.string().min(1).optional(),
  COMMISSION_RATE: z.coerce.number().min(0).max(1).default(DEFAULT_RECONCILIATION_CONFIG.commissionRate),
  SHORTPAY_TOLERANCE: z.coerce.number().min(0).default(DEFAULT_RECONCILIATION_CONFIG.shortpayTolerance),
  CREATED_AFTER: z.string().default('2020-01-01T00:00:00Z'),
});

export type Env = z.infer<typeof envSchema> & {
  SP_API_CLIENT_ID: string;
  SP_API_CLIENT_SECRET: string;
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  const clientId = parsed.data.SP_API_CLIENT_ID ?? parsed.data.CLIENT_ID;
  const clientSecret = parsed.data.SP_API_CLIENT_SECRET ?? parsed.data.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      'Missing credentials: set SP_API_CLIENT_ID/SP_API_CLIENT_SECRET or CLIENT_ID/CLIENT_SECRET',
    );
    process.exit(1);
  }

  return {
    ...parsed.data,
    SP_API_CLIENT_ID: clientId,
    SP_API_CLIENT_SECRET: clientSecret,
  };
}

export const env = loadEnv();

export function toReconciliationConfig(): {
  commissionRate: number;
  shortpayTolerance: number;
} {
  return {
    commissionRate: env.COMMISSION_RATE,
    shortpayTolerance: env.SHORTPAY_TOLERANCE,
  };
}
