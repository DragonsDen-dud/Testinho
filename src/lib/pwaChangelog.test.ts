import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_VERSION } from './changelog'
import { fetchIncomingChangelogEntry } from './pwaChangelog'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function mockFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch
}

describe('fetchIncomingChangelogEntry', () => {
  it('returns the newest entry when its version differs from CURRENT_VERSION', async () => {
    mockFetch({ ok: true, json: async () => [{ version: '99.0.0', bullets: ['Something new.'] }] })
    const entry = await fetchIncomingChangelogEntry()
    expect(entry).toEqual({ version: '99.0.0', bullets: ['Something new.'] })
  })

  it('returns undefined when the fetched newest version matches CURRENT_VERSION (nothing new)', async () => {
    mockFetch({ ok: true, json: async () => [{ version: CURRENT_VERSION, bullets: ['Whatever is already known.'] }] })
    const entry = await fetchIncomingChangelogEntry()
    expect(entry).toBeUndefined()
  })

  it('returns undefined on a network error rather than throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    const entry = await fetchIncomingChangelogEntry()
    expect(entry).toBeUndefined()
  })

  it('returns undefined on a non-OK response', async () => {
    mockFetch({ ok: false })
    const entry = await fetchIncomingChangelogEntry()
    expect(entry).toBeUndefined()
  })

  it('returns undefined when the response body is an empty array', async () => {
    mockFetch({ ok: true, json: async () => [] })
    const entry = await fetchIncomingChangelogEntry()
    expect(entry).toBeUndefined()
  })

  it('requests with cache: no-store so a stale cached copy is never used', async () => {
    mockFetch({ ok: true, json: async () => [{ version: '99.0.0', bullets: ['x'] }] })
    await fetchIncomingChangelogEntry()
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/changelog.json'), { cache: 'no-store' })
  })
})
