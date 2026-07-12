import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Satisfy the env schema so importing modules that load env doesn't exit.
    env: {
      SP_API_CLIENT_ID: 'test-client-id',
      SP_API_CLIENT_SECRET: 'test-client-secret',
    },
  },
});
