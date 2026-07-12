import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import type { ReconciliationConfig } from 'reconciliation-engine';
import { z } from 'zod';

const cwd = process.cwd();
for (const envPath of [resolve(cwd, '.env'), resolve(cwd, '../sp-api-service/.env')]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, quiet: true });
    break;
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SP_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  SP_API_CLIENT_ID: z.string().min(1).optional(),
  SP_API_CLIENT_SECRET: z.string().min(1).optional(),
  CLIENT_ID: z.string().min(1).optional(),
  CLIENT_SECRET: z.string().min(1).optional(),
  COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.15),
  SHORTPAY_TOLERANCE: z.coerce.number().min(0).default(0.5),
  CREATED_AFTER: z.string().default('2020-01-01T00:00:00Z'),
  DATA_CACHE_TTL_MS: z.coerce.number().int().min(0).default(30_000),
  // Treat an empty value (common in a copied .env) as "not set" rather than invalid.
  GEMINI_API_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional(),
  ),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.1-flash-lite'),
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

export function toReconciliationConfig(): ReconciliationConfig {
  return {
    commissionRate: env.COMMISSION_RATE,
    shortpayTolerance: env.SHORTPAY_TOLERANCE,
  };
}

/** Allowed CORS origins as an array, or '*' to allow all. */
export function corsOrigins(): string | string[] {
  if (env.CORS_ORIGIN.trim() === '*') {
    return '*';
  }
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
}
