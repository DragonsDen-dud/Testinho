import { parseAllowedOrigins, isOriginAllowed, corsHeaders, checkRateLimit, clientKeyFromRequest, type RateLimitEntry } from './_lib/security'

// Article 4 — the Connectivity Check module (E.9) pings this to confirm our
// own proxy is reachable, before Article 12's scheduled-report check ever
// attempts a real Anthropic call. Deliberately does not itself call
// Anthropic — a liveness check of the proxy shouldn't cost an API call or
// require a key just to answer "is the network path up".

export const config = { runtime: 'edge' }

// See api/ai-report.ts / api/_lib/security.ts for the same allowlist
// mechanism and its limitations.
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS)

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60 // no Anthropic call happens here — generous, just anti-hammer

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  })
}

export default function handler(req: Request): Response {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin, ALLOWED_ORIGINS)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, cors)
  }

  if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
    return jsonResponse(403, { ok: false, error: 'origin_not_allowed' }, cors)
  }

  const rateLimit = checkRateLimit(rateLimitStore, clientKeyFromRequest(req), Date.now(), RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)
  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      { ok: false, error: 'rate_limited' },
      { ...cors, 'retry-after': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
    )
  }

  return jsonResponse(200, { ok: true }, cors)
}
