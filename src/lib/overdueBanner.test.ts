import { describe, expect, it } from 'vitest'
import { shouldShowOverdueBanner } from './overdueBanner'

describe('shouldShowOverdueBanner (Article 30 — once per calendar day, not once per session)', () => {
  it('shows when it has never been shown before', () => {
    expect(shouldShowOverdueBanner(undefined, '2026-07-15')).toBe(true)
  })

  it('does not show again the same calendar day it was already shown', () => {
    expect(shouldShowOverdueBanner('2026-07-15', '2026-07-15')).toBe(false)
  })

  it('shows again on a new calendar day, even if the app was reopened many times the prior day', () => {
    expect(shouldShowOverdueBanner('2026-07-14', '2026-07-15')).toBe(true)
  })

  it('is a pure date-string comparison, not a boolean/session flag — reopening the app 5 times in one day stays suppressed', () => {
    const today = '2026-07-15'
    let lastShown: string | undefined = undefined
    // First open of the day: shows, and the caller persists lastShown = today.
    expect(shouldShowOverdueBanner(lastShown, today)).toBe(true)
    lastShown = today
    // Every subsequent reopen the same day must stay suppressed.
    for (let i = 0; i < 5; i++) {
      expect(shouldShowOverdueBanner(lastShown, today)).toBe(false)
    }
  })
})
