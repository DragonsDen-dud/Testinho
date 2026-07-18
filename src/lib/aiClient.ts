import type { ReportType } from './aiPrompts'

// Article 4 — the client never holds a direct fetch to api.anthropic.com.
// Everything goes through our own proxy, which is the only thing that talks
// to Anthropic. Defaults to a same-origin relative path (correct once this
// is deployed alongside the /api functions on Vercel); overridable for local
// dev/testing against a stand-in server.
const PROXY_BASE_URL = (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? '/api'

export interface AiCallInput {
  reportType: ReportType
  autoStats: Record<string, unknown>
  question?: string
  habitName?: string
  northStar?: string
  apiKey: string
  model: string
}

export type AiCallResult = { ok: true; text: string } | { ok: false; error: string }

export async function callAiProxy(input: AiCallInput): Promise<AiCallResult> {
  try {
    const res = await fetch(`${PROXY_BASE_URL}/ai-report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reportType: input.reportType,
        context: {
          autoStats: input.autoStats,
          question: input.question,
          habitName: input.habitName,
          northStar: input.northStar,
        },
        apiKey: input.apiKey,
        model: input.model,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      const error = data?.error ?? `HTTP ${res.status}`
      // Every caller (freeform + scheduled reports) funnels through here, and
      // both UI paths currently show only a generic "couldn't reach it"
      // message — this is the one place that always sees the real reason,
      // so it's the one place that logs it, rather than duplicating this in
      // every call site. `detail` (e.g. origin_not_allowed's received-vs-
      // allowed breakdown) is optional and only some error codes set it —
      // folded into the surfaced string when present so it's visible
      // wherever `error` is already shown, not just in the console.
      console.error('[aiClient] ai-report request failed:', res.status, error, data?.detail)
      return { ok: false, error: data?.detail ? `${error}: ${data.detail}` : error }
    }
    return { ok: true, text: data.text }
  } catch (err) {
    console.error('[aiClient] ai-report request threw before a response was received:', err)
    return { ok: false, error: 'network_error' }
  }
}

/** Connectivity Check (Article 4) — a liveness ping at our own proxy, not Anthropic itself. */
export async function checkAiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE_URL}/ai-health`, { method: 'GET' })
    if (!res.ok) return false
    const data = await res.json()
    return data?.ok === true
  } catch {
    return false
  }
}
