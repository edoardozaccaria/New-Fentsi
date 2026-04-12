// In-memory token bucket rate limiter for Next.js API routes.
// Resets across server restarts — suitable for MVP / single-instance deployments.
// For multi-instance production use, replace with Redis (Upstash, etc.).

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Maximum requests allowed per window. Default: 10 */
  limit?: number;
  /** Window duration in milliseconds. Default: 60_000 (1 min) */
  windowMs?: number;
}

/**
 * Check whether a request identified by `key` (e.g. IP or user ID) should
 * be rate-limited.
 *
 * Returns `{ allowed: true }` when the request is within the limit, or
 * `{ allowed: false, retryAfterMs }` when the bucket is exhausted.
 */
export function checkRateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: RateLimitOptions = {}
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, lastRefill: now };

  // Refill tokens proportionally to elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * limit);
  const tokens = Math.min(limit, bucket.tokens + refill);
  const lastRefill = refill > 0 ? now : bucket.lastRefill;

  if (tokens <= 0) {
    const retryAfterMs = windowMs - elapsed;
    buckets.set(key, { tokens, lastRefill });
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  buckets.set(key, { tokens: tokens - 1, lastRefill });
  return { allowed: true };
}

/** Extract a rate-limit key from a Next.js Request (prefers X-Forwarded-For). */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return 'unknown';
}

/** Convenience: return a 429 Response with Retry-After header. */
export function rateLimitResponse(retryAfterMs: number): Response {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}
