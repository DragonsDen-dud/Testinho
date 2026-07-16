import { describe, expect, it } from 'vitest'
import { computeNextDueDate } from './todoRecurrence'
import type { TodoRecurrence } from '../db/types'

describe('computeNextDueDate (Article 28)', () => {
  it('daily: adds the interval in days, default interval 1', () => {
    expect(computeNextDueDate('2026-07-01', { type: 'daily', params: {} })).toBe('2026-07-02')
    expect(computeNextDueDate('2026-07-01', { type: 'daily', params: { interval: 3 } })).toBe('2026-07-04')
  })

  it('weekly: adds interval * 7 days', () => {
    expect(computeNextDueDate('2026-07-01', { type: 'weekly', params: {} })).toBe('2026-07-08')
    expect(computeNextDueDate('2026-07-01', { type: 'weekly', params: { interval: 2 } })).toBe('2026-07-15')
  })

  it('monthly: preserves day-of-month', () => {
    expect(computeNextDueDate('2026-03-15', { type: 'monthly', params: {} })).toBe('2026-04-15')
  })

  it('monthly: clamps to the last day when the target month is shorter (Jan 31 -> Feb 28)', () => {
    expect(computeNextDueDate('2026-01-31', { type: 'monthly', params: {} })).toBe('2026-02-28')
  })

  it('monthly: clamps correctly into a leap February', () => {
    // 2028 is a leap year.
    expect(computeNextDueDate('2028-01-31', { type: 'monthly', params: {} })).toBe('2028-02-29')
  })

  it('monthly: rolls over the year boundary', () => {
    expect(computeNextDueDate('2026-12-15', { type: 'monthly', params: {} })).toBe('2027-01-15')
  })

  it('custom: treated as daily-by-interval (generic fallback, mirrors Habit schedule custom)', () => {
    expect(computeNextDueDate('2026-07-01', { type: 'custom', params: { interval: 5 } })).toBe('2026-07-06')
  })

  it('a late completion does not compress the next interval — computed from the original dueDate, not "today"', () => {
    // The instance was due 2026-07-01 but got completed 3 days late, on 2026-07-04.
    // The next occurrence must still land 7 days after the *original* due date.
    const recurrence: TodoRecurrence = { type: 'weekly', params: {} }
    const originalDueDate = '2026-07-01'
    const nextDueDate = computeNextDueDate(originalDueDate, recurrence)
    expect(nextDueDate).toBe('2026-07-08')
    // Confirm this does NOT equal "7 days after the late completion date" (which would be 2026-07-11).
    expect(nextDueDate).not.toBe('2026-07-11')
  })
})
