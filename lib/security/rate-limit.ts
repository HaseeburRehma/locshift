/**
 * In-memory sliding-window rate limiter. Best-effort per serverless
 * instance (Vercel may run several in parallel, each with its own window) —
 * enough to stop a single client from hammering an endpoint, not a
 * distributed guarantee.
 */

export type RateResult = { ok: true } | { ok: false; retryAfterSec: number }

export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5_000) {
  const hits = new Map<string, number[]>()

  return function take(key: string, now: number = Date.now()): RateResult {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > maxKeys) {
      for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k)
    }
    return { ok: true }
  }
}

/** Client IP as seen by Vercel / a reverse proxy. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
