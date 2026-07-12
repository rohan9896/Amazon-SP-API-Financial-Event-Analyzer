export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until the oldest in-window request expires and a slot frees. 0 when allowed. */
  retryAfterMs: number;
};

/**
 * Simple in-memory sliding-window request counter used to simulate Amazon's
 * `429 TooManyRequests` throttling behavior. Not distributed / per-client — good enough
 * for a local mock service.
 *
 * When throttled, returns `retryAfterMs` so the route can send an accurate `Retry-After`
 * header and well-behaved clients can back off precisely instead of guessing.
 */
export function createRateLimiter(thresholdRequests: number, windowMs: number) {
  let requestTimestamps: number[] = [];

  return function checkRateLimit(): RateLimitResult {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < windowMs);

    if (requestTimestamps.length >= thresholdRequests) {
      const oldest = requestTimestamps[0];
      const retryAfterMs = Math.max(0, windowMs - (now - oldest));
      return { allowed: false, retryAfterMs };
    }

    requestTimestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  };
}
