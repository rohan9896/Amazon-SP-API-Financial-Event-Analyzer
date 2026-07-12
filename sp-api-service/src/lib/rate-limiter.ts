/**
 * Simple in-memory sliding-window request counter used to simulate Amazon's
 * `429 TooManyRequests` throttling behavior. Not distributed / per-client — good enough
 * for a local mock service.
 */
export function createRateLimiter(thresholdRequests: number, windowMs: number) {
  let requestTimestamps: number[] = [];

  return function checkRateLimit(): boolean {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < windowMs);

    if (requestTimestamps.length >= thresholdRequests) {
      return false;
    }

    requestTimestamps.push(now);
    return true;
  };
}
