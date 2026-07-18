import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://stoa.example'

async function loadHandler() {
  vi.resetModules()
  const mod = await import('./ai-health')
  return mod.default as (req: Request) => Response
}

describe('api/ai-health handler (Step 2 hardening)', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS

  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = ORIGIN
  })

  afterEach(() => {
    process.env.ALLOWED_ORIGINS = originalEnv
  })

  it('accepts a request from the allowed origin and reflects it in CORS headers', async () => {
    const handler = await loadHandler()
    const res = handler(new Request('https://api.example/ai-health', { headers: { origin: ORIGIN } }))
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN)
  })

  it('rejects a request carrying a disallowed Origin header with 403', async () => {
    const handler = await loadHandler()
    const res = handler(
      new Request('https://api.example/ai-health', { headers: { origin: 'https://evil.example' } }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('origin_not_allowed')
    expect(body.detail).toContain('https://evil.example')
  })

  it('answers a CORS preflight (OPTIONS) with 204 and no body', async () => {
    const handler = await loadHandler()
    const res = handler(
      new Request('https://api.example/ai-health', { method: 'OPTIONS', headers: { origin: ORIGIN } }),
    )
    expect(res.status).toBe(204)
  })

  it('actually triggers the rate limit once one client exceeds the cap', async () => {
    const handler = await loadHandler()
    let last!: Response
    for (let i = 0; i < 61; i++) {
      last = handler(
        new Request('https://api.example/ai-health', {
          headers: { origin: ORIGIN, 'x-forwarded-for': '10.0.0.1' },
        }),
      )
    }
    expect(last.status).toBe(429)
    const body = await last.json()
    expect(body).toEqual({ ok: false, error: 'rate_limited' })
    expect(last.headers.get('retry-after')).toBeTruthy()
  })

  it('keys the rate limit per client — a different IP is unaffected', async () => {
    const handler = await loadHandler()
    for (let i = 0; i < 60; i++) {
      handler(
        new Request('https://api.example/ai-health', {
          headers: { origin: ORIGIN, 'x-forwarded-for': '10.0.0.2' },
        }),
      )
    }
    const res = handler(
      new Request('https://api.example/ai-health', {
        headers: { origin: ORIGIN, 'x-forwarded-for': '10.0.0.3' },
      }),
    )
    expect(res.status).toBe(200)
  })
})
