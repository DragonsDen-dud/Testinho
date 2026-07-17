import { buildSystemPrompt, buildUserMessage, type ReportType } from '../src/lib/aiPrompts'

// Article 4 — the only thing in this app that talks to api.anthropic.com.
// The client posts { reportType, context, question? } (plus a per-request
// apiKey/model — see Article 38: this is a local-first, no-account app, so
// each user brings their own key, stored client-side only) to this endpoint.
// The key is used for exactly this one outbound call and never persisted or
// logged here.

export const config = { runtime: 'edge' }

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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, error: 'method_not_allowed' })

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' })
  }

  if (body.reportType !== 'scheduled_template' && body.reportType !== 'freeform_query') {
    return jsonResponse(400, { ok: false, error: 'invalid_report_type' })
  }
  if (!body.apiKey || typeof body.apiKey !== 'string') {
    return jsonResponse(400, { ok: false, error: 'missing_api_key' })
  }
  if (!body.model || typeof body.model !== 'string') {
    return jsonResponse(400, { ok: false, error: 'missing_model' })
  }
  if (!body.context?.autoStats) {
    return jsonResponse(400, { ok: false, error: 'missing_context' })
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
      return jsonResponse(status === 401 ? 401 : 502, { ok: false, error: message })
    }

    const data = await anthropicRes.json()
    const text = data?.content?.[0]?.text
    if (typeof text !== 'string') return jsonResponse(502, { ok: false, error: 'unexpected_response_shape' })

    return jsonResponse(200, { ok: true, text })
  } catch {
    return jsonResponse(502, { ok: false, error: 'upstream_unreachable' })
  }
}
