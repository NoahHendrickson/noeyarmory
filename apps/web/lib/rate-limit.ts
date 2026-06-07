interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, RateLimitBucket>();

  return {
    check(key: string, now = Date.now()): boolean {
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (current.count >= limit) return false;

      current.count += 1;
      return true;
    },
  };
}
