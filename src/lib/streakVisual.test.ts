import { describe, expect, it } from 'vitest'
import { streakTier, isStreakAlive, justCrossedTier } from './streakVisual'

describe('streakTier', () => {
  it('maps the exact boundaries from the spec table', () => {
    expect(streakTier(0)).toBe('sprout')
    expect(streakTier(1)).toBe('sprout')
    expect(streakTier(2)).toBe('sprout')
    expect(streakTier(3)).toBe('flameSmall')
    expect(streakTier(6)).toBe('flameSmall')
    expect(streakTier(7)).toBe('flameMedium')
    expect(streakTier(13)).toBe('flameMedium')
    expect(streakTier(14)).toBe('flameGlow')
    expect(streakTier(29)).toBe('flameGlow')
    expect(streakTier(30)).toBe('milestone')
    expect(streakTier(365)).toBe('milestone') // one final tier, not an ever-growing list
  })
})

describe('isStreakAlive', () => {
  it('is false only at exactly 0 days', () => {
    expect(isStreakAlive(0)).toBe(false)
    expect(isStreakAlive(1)).toBe(true)
    expect(isStreakAlive(30)).toBe(true)
  })
})

describe('justCrossedTier', () => {
  it('detects the exact tier boundaries from the spec', () => {
    expect(justCrossedTier(2, 3)).toBe(true) // sprout -> flameSmall
    expect(justCrossedTier(6, 7)).toBe(true) // flameSmall -> flameMedium
    expect(justCrossedTier(13, 14)).toBe(true) // flameMedium -> flameGlow
    expect(justCrossedTier(29, 30)).toBe(true) // flameGlow -> milestone
  })

  it('is false within the same tier', () => {
    expect(justCrossedTier(3, 4)).toBe(false)
    expect(justCrossedTier(15, 20)).toBe(false)
    expect(justCrossedTier(31, 40)).toBe(false) // milestone is one final tier, no further crossings
  })

  it('is false when the streak did not grow (reset, or unchanged)', () => {
    expect(justCrossedTier(10, 10)).toBe(false)
    expect(justCrossedTier(10, 0)).toBe(false) // a reset must never look like a "crossing"
    expect(justCrossedTier(30, 2)).toBe(false)
  })

  it('is false for a day-to-day increment that happens to land past a boundary from below the previous tier already', () => {
    // Guards against a false positive if previousDays was itself invalid/negative-ish input.
    expect(justCrossedTier(0, 1)).toBe(false) // both sprout
  })
})
