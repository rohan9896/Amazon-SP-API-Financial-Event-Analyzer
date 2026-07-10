import { randomBytes } from 'node:crypto';

import { env } from '../lib/env.js';

type AccessTokenRecord = {
  expiresAt: number;
};

const accessTokens = new Map<string, AccessTokenRecord>();

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
};

export function validateClientCredentials(clientId: string, clientSecret: string): boolean {
  return clientId === env.CLIENT_ID && clientSecret === env.CLIENT_SECRET;
}

export function isValidRefreshToken(refreshToken: string): boolean {
  return refreshToken === env.MOCK_REFRESH_TOKEN;
}

export function issueAccessToken(): TokenResponse {
  const accessToken = `Atza|${randomBytes(24).toString('base64url')}`;
  const expiresIn = env.ACCESS_TOKEN_TTL_SECONDS;

  accessTokens.set(accessToken, {
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return {
    access_token: accessToken,
    refresh_token: env.MOCK_REFRESH_TOKEN,
    token_type: 'bearer',
    expires_in: expiresIn,
  };
}

/** For future business routes to call inline — not wired globally yet. */
export function getAccessToken(token: string): AccessTokenRecord | null {
  const record = accessTokens.get(token);
  if (!record) {
    return null;
  }

  if (Date.now() >= record.expiresAt) {
    accessTokens.delete(token);
    return null;
  }

  return record;
}
