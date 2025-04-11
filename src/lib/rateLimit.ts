import type { NextApiResponse } from 'next';
import LRU from 'lru-cache';

interface RateLimitOptions {
  interval: number; // milliseconds
  uniqueTokenPerInterval: number;
}

interface RateLimiter {
  check: (
    res: NextApiResponse,
    limit: number,
    token: string
  ) => Promise<void>;
}

/**
 * Creates a rate limiter for API endpoints
 * @param options Rate limit options
 * @returns Rate limiter instance
 */
export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRU({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (res: NextApiResponse, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;
        
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', isRateLimited ? 0 : limit - currentUsage);
        
        return isRateLimited ? reject() : resolve();
      }),
  };
} 