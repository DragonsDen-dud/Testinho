import { describe, expect, it } from 'vitest'
import { parseAllowedOrigins, isOriginAllowed, corsHeaders, checkRateLimit, clientKeyFromRequest, type RateLimitEntry } from './security'

describe('parseAllowedOrigins', () => {
  it('returns an empty list when unset', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
  })

  it('splits, trims, and drops empty entries', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example ,, ')).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })
})

describe('isOriginAllowed', () => {
  const allowed = ['https://stoa.example']

  it('allows a request with no Origin header at all (non-browser caller)', () => {
    expect(isOriginAllowed(null, allowed)).toBe(true)
  })

  it('allows an Origin that matches the allowlist exactly', () => {
    expect(isOriginAllowed('https://stoa.example', allowed)).toBe(true)
  })

  it('rejects an Origin that is not in the allowlist', () => {
    expect(isOriginAllowed('https://evil.example', allowed)).toBe(false)
  })

  it('rejects any Origin when the allowlist is empty (unconfigured)', () => {
    expect(isOriginAllowed('https://stoa.example', [])).toBe(false)
  })
})

describe('corsHeaders', () => {
  const allowed = ['https://stoa.example']

  it('reflects the origin back when it matches the allowlist', () => {
    const headers = corsHeaders('https://stoa.example', allowed)
    expect(headers['access-control-allow-origin']).toBe('https://stoa.example')
  })

  it('returns no CORS headers for a non-matching origin', () => {
    expect(corsHeaders('https://evil.example', allowed)).toEqual({})
  })

  it('returns no CORS headers when there is no origin', () => {
    expect(corsHeaders(null, allowed)).toEqual({})
  })
})

describe('checkRateLimit', () => {
  it('allows requests under the cap within the same window', () => {
    const store = new Map<string, RateLimitEntry>()
    const now = 1000
    const r1 = checkRateLimit(store, 'client-a', now, 60_000, 3)
    const r2 = checkRateLimit(store, 'client-a', now + 10, 60_000, 3)
    const r3 = checkRateLimit(store, 'client-a', now + 20, 60_000, 3)
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true])
    expect(r3.remaining).toBe(0)
  })

  it('rejects the request that exceeds the cap within the window', () => {
    const store = new Map<string, RateLimitEntry>()
    const now = 1000
    checkRateLimit(store, 'client-a', now, 60_000, 2)
    checkRateLimit(store, 'client-a', now + 10, 60_000, 2)
    const blocked = checkRateLimit(store, 'client-a', now + 20, 60_000, 2)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets once the window has elapsed', () => {
    const store = new Map<string, RateLimitEntry>()
    checkRateLimit(store, 'client-a', 0, 60_000, 1)
    const stillBlocked = checkRateLimit(store, 'client-a', 30_000, 60_000, 1)
    expect(stillBlocked.allowed).toBe(false)
    const afterWindow = checkRateLimit(store, 'client-a', 60_001, 60_000, 1)
    expect(afterWindow.allowed).toBe(true)
  })

  it('tracks separate clients independently', () => {
    const store = new Map<string, RateLimitEntry>()
    checkRateLimit(store, 'client-a', 0, 60_000, 1)
    const other = checkRateLimit(store, 'client-b', 0, 60_000, 1)
    expect(other.allowed).toBe(true)
  })
})

describe('clientKeyFromRequest', () => {
  it('uses the first entry of x-forwarded-for when present', () => {
    const req = new Request('https://example.com', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(clientKeyFromRequest(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('https://example.com', { headers: { 'x-real-ip': '9.9.9.9' } })
    expect(clientKeyFromRequest(req)).toBe('9.9.9.9')
  })

  it('falls back to a constant key when neither header is present', () => {
    const req = new Request('https://example.com')
    expect(clientKeyFromRequest(req)).toBe('unknown')
  })
})
