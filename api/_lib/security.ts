// Step 2 hardening for the two proxy endpoints — basic origin allowlisting +
// rate limiting, per Section G item 19 / the D.o.D checklist ("прокси-
// эндпоинты защищены базовым origin-check/rate-limit до публичного
// деплоя"). Deliberately basic: this is a single-user, bring-your-own-key
// app (Article 38), not a multi-tenant service — the goal is closing the
// "open relay" hole (someone else's website driving traffic through our
// deployed function), not building production-grade abuse infrastructure.

export function parseAllowedOrigins(envValue: string | undefined): string[] {
  if (!envValue) return []
  return envValue
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

/**
 * Browsers send an Origin header on same-origin POST/fetch requests too,
 * not just cross-origin ones, so "Origin present" can't be used to mean
 * "cross-origin". Non-browser callers (curl, server-to-server) typically
 * send no Origin header at all — those pass this check (there's nothing to
 * compare) and rely on the rate limiter instead. Any request that DOES
 * carry an Origin header must match the configured allowlist exactly.
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return true
  return allowedOrigins.includes(origin)
}

export function corsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  if (origin && allowedOrigins.includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'origin',
    }
  }
  return {}
}

export interface RateLimitEntry {
  count: number
  windowStart: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Fixed-window counter, in-memory (the Map lives in module scope in each
 * handler file, passed in here by the caller). On Vercel Edge Functions
 * this state resets on cold start, on redeploy, and is NOT shared across
 * concurrently-warm instances behind the same route — it's a best-effort
 * per-instance cap, not a durable cross-instance guarantee. That's an
 * accepted tradeoff for a single-user app; a real multi-tenant limit would
 * need a shared store (e.g. Redis/Upstash), which is out of scope here.
 */
export function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number,
): RateLimitResult {
  const entry = store.get(key)
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs }
  }
  entry.count += 1
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.windowStart + windowMs }
}

export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
