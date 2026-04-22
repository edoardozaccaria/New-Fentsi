/**
 * Dual-mode rate limiter:
 *   - Production (UPSTASH_REDIS_REST_URL set) → @upstash/ratelimit + Redis (works across serverless replicas)
 *   - Local dev (no env vars)               → in-memory sliding window (single process only)
 *
 * Usage: identical API in both modes — just call rateLimit(key, config).
 */

// ─── Shared types ────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// ─── In-memory fallback (local dev only) ─────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

// Purge expired entries every 60s to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memoryStore.forEach((entry, key) => {
      if (now > entry.resetAt) memoryStore.delete(key)
    })
  }, 60_000).unref?.()
}

function rateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1_000
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs }
    memoryStore.set(key, newEntry)
    return { allowed: true, remaining: config.limit - 1, resetAt: newEntry.resetAt }
  }

  entry.count++
  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

// ─── Upstash implementation (production) ─────────────────────────────────────

let upstashLimiter: ((key: string, config: RateLimitConfig) => Promise<RateLimitResult>) | null = null

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // Cache limiters by window config to avoid re-creating them
  const limiters = new Map<string, InstanceType<typeof Ratelimit>>()

  upstashLimiter = async (key: string, config: RateLimitConfig): Promise<RateLimitResult> => {
    const cacheKey = `${config.limit}:${config.windowSeconds}`

    if (!limiters.has(cacheKey)) {
      limiters.set(
        cacheKey,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
          analytics: true,
          prefix: 'fentsi_rl',
        }),
      )
    }

    const limiter = limiters.get(cacheKey)!
    const { success, remaining, reset } = await limiter.limit(key)

    return {
      allowed: success,
      remaining,
      resetAt: reset,
    }
  }

  return upstashLimiter
}

// ─── Public API ───────────────────────────────────────────────────────────────

const isUpstashConfigured =
  typeof process !== 'undefined' &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Rate-limit a key. Returns the result synchronously in local dev (in-memory),
 * and asynchronously in production (Upstash Redis).
 *
 * Always await this function — it returns a Promise in both modes.
 */
export async function rateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (isUpstashConfigured) {
    try {
      const limiter = await getUpstashLimiter()
      return await limiter(key, config)
    } catch (err) {
      // Upstash unreachable → degrade gracefully to allow the request
      console.error('[rate-limit] Upstash error, allowing request:', err)
      return { allowed: true, remaining: config.limit, resetAt: Date.now() + config.windowSeconds * 1_000 }
    }
  }

  // Local dev: synchronous in-memory
  return rateLimitMemory(key, config)
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
