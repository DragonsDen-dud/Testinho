import { buildSystemPrompt, buildUserMessage, type ReportType } from '../src/lib/aiPrompts'
import {
  parseAllowedOrigins,
  isOriginAllowed,
  corsHeaders,
  checkRateLimit,
  clientKeyFromRequest,
  type RateLimitEntry,
} from './_lib/security'

// Article 4 — the only thing in this app that talks to api.anthropic.com.
// The client posts { reportType, context, question? } (plus a per-request
// apiKey/model — see Article 38: this is a local-first, no-account app, so
// each user brings their own key, stored client-side only) to this endpoint.
// The key is used for exactly this one outbound call and never persisted or
// logged here.

export const config = { runtime: 'edge' }

// Step 2 — set ALLOWED_ORIGINS in the Vercel project's environment variables
// once the frontend is deployed (comma-separated if there's more than one,
// e.g. a preview + production URL). Left unset here deliberately rather
// than hardcoded, since no real deploy URL exists yet (Step 3).
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS)

// See api/_lib/security.ts for why this is an in-memory, per-instance,
// cold-start-resetting limit and why that's an accepted tradeoff here.
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20 // this endpoint costs a real Anthropic call — keep it tight

interface RequestBody {
  reportType: ReportType
  context: {
    autoStats: Record<string, unknown>
    question?: string
    habitName?: string
    northStar?: string
  }
  apiKey: string
  model: string
}

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin, ALLOWED_ORIGINS)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, cors)

  if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
    // Nothing secret here — these are meant to be public frontend origins —
    // so echoing both sides back is safe, and it's the difference between a
    // real mismatch being instantly diagnosable versus another guessing round.
    return jsonResponse(
      403,
      { ok: false, error: 'origin_not_allowed', detail: `received "${origin}", allowed: [${ALLOWED_ORIGINS.join(', ')}]` },
      cors,
    )
  }

  const rateLimit = checkRateLimit(rateLimitStore, clientKeyFromRequest(req), Date.now(), RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)
  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      { ok: false, error: 'rate_limited' },
      { ...cors, 'retry-after': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
    )
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' }, cors)
  }

  if (body.reportType !== 'scheduled_template' && body.reportType !== 'freeform_query') {
    return jsonResponse(400, { ok: false, error: 'invalid_report_type' }, cors)
  }
  if (!body.apiKey || typeof body.apiKey !== 'string') {
    return jsonResponse(400, { ok: false, error: 'missing_api_key' }, cors)
  }
  if (!body.model || typeof body.model !== 'string') {
    return jsonResponse(400, { ok: false, error: 'missing_model' }, cors)
  }
  if (!body.context?.autoStats) {
    return jsonResponse(400, { ok: false, error: 'missing_context' }, cors)
  }

  const system = buildSystemPrompt(body.reportType)
  const userMessage = buildUserMessage(body.reportType, body.context)

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': body.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) {
      const status = anthropicRes.status
      const errBody = await anthropicRes.json().catch(() => null)
      const message = status === 401 ? 'invalid_api_key' : (errBody?.error?.message ?? `anthropic_error_${status}`)
      return jsonResponse(status === 401 ? 401 : 502, { ok: false, error: message }, cors)
    }

    const data = await anthropicRes.json()
    const text = data?.content?.[0]?.text
    if (typeof text !== 'string') return jsonResponse(502, { ok: false, error: 'unexpected_response_shape' }, cors)

    return jsonResponse(200, { ok: true, text }, cors)
  } catch {
    return jsonResponse(502, { ok: false, error: 'upstream_unreachable' }, cors)
  }
}
