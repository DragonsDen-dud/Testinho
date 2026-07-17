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
    if (!res.ok || !data.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` }
    return { ok: true, text: data.text }
  } catch {
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
