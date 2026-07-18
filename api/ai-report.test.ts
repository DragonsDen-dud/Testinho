import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://stoa.example'

async function loadHandler() {
  vi.resetModules()
  const mod = await import('./ai-report')
  return mod.default as (req: Request) => Promise<Response>
}

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    reportType: 'freeform_query',
    context: { autoStats: {}, question: 'How am I doing?' },
    apiKey: 'sk-ant-test-key',
    model: 'claude-haiku-test',
    ...overrides,
  }
}

function postRequest(headers: Record<string, string>, body: Record<string, unknown> = requestBody()) {
  return new Request('https://api.example/ai-report', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('api/ai-report handler (Step 2 hardening)', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = ORIGIN
    fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ content: [{ text: 'ok' }] }), { status: 200 }))
  })

  afterEach(() => {
    process.env.ALLOWED_ORIGINS = originalEnv
    fetchSpy.mockRestore()
  })

  it('rejects a disallowed Origin with 403 before ever calling Anthropic', async () => {
    const handler = await loadHandler()
    const res = await handler(postRequest({ origin: 'https://evil.example' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'origin_not_allowed' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('accepts a valid request from the allowed origin and does call Anthropic', async () => {
    const handler = await loadHandler()
    const res = await handler(postRequest({ origin: ORIGIN }))
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test-key')
  })

  it('answers a CORS preflight (OPTIONS) with 204 and does not call Anthropic', async () => {
    const handler = await loadHandler()
    const res = await handler(
      new Request('https://api.example/ai-report', { method: 'OPTIONS', headers: { origin: ORIGIN } }),
    )
    expect(res.status).toBe(204)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('actually triggers the rate limit after 20 requests/min from one client, and stops calling Anthropic once blocked', async () => {
    const handler = await loadHandler()
    let last!: Response
    for (let i = 0; i < 21; i++) {
      last = await handler(postRequest({ origin: ORIGIN, 'x-forwarded-for': '10.0.0.9' }))
    }
    expect(last.status).toBe(429)
    const body = await last.json()
    expect(body).toEqual({ ok: false, error: 'rate_limited' })
    expect(fetchSpy).toHaveBeenCalledTimes(20)
  })

  it('keys the rate limit per client — a different IP still gets through after another IP is blocked', async () => {
    const handler = await loadHandler()
    for (let i = 0; i < 20; i++) {
      await handler(postRequest({ origin: ORIGIN, 'x-forwarded-for': '10.0.0.10' }))
    }
    const blocked = await handler(postRequest({ origin: ORIGIN, 'x-forwarded-for': '10.0.0.10' }))
    expect(blocked.status).toBe(429)

    const otherClient = await handler(postRequest({ origin: ORIGIN, 'x-forwarded-for': '10.0.0.11' }))
    expect(otherClient.status).toBe(200)
  })
})
