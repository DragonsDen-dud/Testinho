import { describe, expect, it } from 'vitest'
import { CHANGELOG, CURRENT_VERSION, shouldShowWhatsNew } from './changelog'

describe('changelog data (Article 56)', () => {
  it('CURRENT_VERSION matches the first (newest) entry', () => {
    expect(CURRENT_VERSION).toBe(CHANGELOG[0].version)
  })

  it('every entry has 2-3 bullets, per spec', () => {
    for (const entry of CHANGELOG) {
      expect(entry.bullets.length).toBeGreaterThanOrEqual(2)
      expect(entry.bullets.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('shouldShowWhatsNew (Article 56)', () => {
  it('shows when nothing has ever been seen', () => {
    expect(shouldShowWhatsNew(undefined)).toBe(true)
  })

  it('shows when the last-seen version is older than current', () => {
    expect(shouldShowWhatsNew('0.9.0')).toBe(true)
  })

  it('does not show again once the current version has been seen', () => {
    expect(shouldShowWhatsNew(CURRENT_VERSION)).toBe(false)
  })

  it('reload at the same version after dismissal never shows it again', () => {
    // Simulates the exact flow: dismiss persists CURRENT_VERSION, then a
    // later reload re-checks against the same stored value.
    let lastSeen: string | undefined = undefined
    expect(shouldShowWhatsNew(lastSeen)).toBe(true)
    lastSeen = CURRENT_VERSION // what the dismiss handler persists
    expect(shouldShowWhatsNew(lastSeen)).toBe(false)
    // A second reload, same stored version.
    expect(shouldShowWhatsNew(lastSeen)).toBe(false)
  })
})
