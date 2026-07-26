import { describe, expect, it } from 'vitest'
import { computeDueDateInfo } from './dueDateChip'
import { addDays, todayKey } from './date'

const fakeT = ((key: string, opts?: { count?: number }) =>
  key === 'todos.dueChipOverdue' ? `${opts?.count}d overdue` : key === 'common.today' ? 'Today' : key === 'todos.rescheduleTomorrow' ? 'Tomorrow' : key
) as unknown as Parameters<typeof computeDueDateInfo>[3]

describe('computeDueDateInfo', () => {
  it('overdue: negative day count, tone overdue', () => {
    const result = computeDueDateInfo(addDays(todayKey(), -3), undefined, 'en', fakeT)
    expect(result).toEqual({ label: '3d overdue', tone: 'overdue' })
  })

  it('today with no scheduled time: "Today", tone today', () => {
    const result = computeDueDateInfo(todayKey(), undefined, 'en', fakeT)
    expect(result).toEqual({ label: 'Today', tone: 'today' })
  })

  it('today WITH a scheduled time: shows the time instead of "Today", tone today', () => {
    const result = computeDueDateInfo(todayKey(), '14:30', 'en', fakeT)
    expect(result).toEqual({ label: '14:30', tone: 'today' })
  })

  it('tomorrow: "Tomorrow" regardless of scheduled time, tone neutral', () => {
    const result = computeDueDateInfo(addDays(todayKey(), 1), '09:00', 'en', fakeT)
    expect(result).toEqual({ label: 'Tomorrow', tone: 'neutral' })
  })

  it('further out: short month/day date, tone neutral, ignores scheduled time', () => {
    const result = computeDueDateInfo(addDays(todayKey(), 10), '09:00', 'en', fakeT)
    expect(result.tone).toBe('neutral')
    expect(result.label).not.toBe('09:00')
    expect(result.label.length).toBeGreaterThan(0)
  })

  it('1 day overdue is singular-safe ("1d overdue", not a pluralization crash)', () => {
    const result = computeDueDateInfo(addDays(todayKey(), -1), undefined, 'en', fakeT)
    expect(result).toEqual({ label: '1d overdue', tone: 'overdue' })
  })
})
