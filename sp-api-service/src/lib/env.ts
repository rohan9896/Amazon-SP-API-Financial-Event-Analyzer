import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ID: z.string().min(1).default('amzn1.application-oa2-client.mockspapi'),
  CLIENT_SECRET: z.string().min(1).default('mock_client_secret'),
  MOCK_REFRESH_TOKEN: z.string().min(1).default('Atzr|mock_refresh_token'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
