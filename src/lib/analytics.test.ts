import { describe, expect, it } from 'vitest'
import {
  computeCompletionRates,
  computeDomainHabitStrength,
  computeTaskRatio,
  computeMoodCorrelationByHabit,
} from './analytics'
import type { Habit, HabitLog, Todo } from '../db/types'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    spaceId: 'space-1',
    name: 'Meditate',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function log(date: string, status: HabitLog['status'], extra: Partial<HabitLog> = {}): HabitLog {
  return { id: `log-${date}`, habitId: 'habit-1', date, status, ...extra }
}

describe('computeCompletionRates (E.6)', () => {
  it('returns one stat per configured window, all covering the given habits', () => {
    const h = habit()
    const stats = computeCompletionRates([h], new Map([[h.id, []]]), '2026-01-10')
    expect(stats.map((s) => s.windowDays)).toEqual([7, 30, 90])
  })

  it('computes percent as done/scheduled over the trailing window, ignoring skip days', () => {
    const h = habit({ createdAt: '2025-01-01T00:00:00.000Z' })
    const logs: HabitLog[] = [
      log('2026-01-04', 'done'),
      log('2026-01-05', 'done'),
      log('2026-01-06', 'not_done'),
      log('2026-01-07', 'skip'),
      // 2026-01-08,09 unlogged, past days -> counted as misses. 2026-01-10
      // (asOfDate itself) unlogged does NOT count — same "don't penalize an
      // unstarted today" rule as habitStrength/habitPatterns.
    ]
    const stats = computeCompletionRates([h], new Map([[h.id, logs]]), '2026-01-10')
    const week = stats.find((s) => s.windowDays === 7)!
    // window = 01-04..01-10; skip (07) and unlogged-today (10) excluded -> 5 scheduled days; 2 done
    expect(week.scheduledDays).toBe(5)
    expect(week.doneDays).toBe(2)
    expect(week.percent).toBe(Math.round((2 / 5) * 100))
  })

  it('clamps the window to the habit creation date when the habit is younger than the window', () => {
    const h = habit({ createdAt: '2026-01-08T00:00:00.000Z' })
    const logs: HabitLog[] = [log('2026-01-08', 'done'), log('2026-01-09', 'done')]
    const stats = computeCompletionRates([h], new Map([[h.id, logs]]), '2026-01-10')
    const week = stats.find((s) => s.windowDays === 7)!
    // Only 01-08, 01-09 count; 01-10 (asOfDate) is unlogged-today, excluded.
    expect(week.scheduledDays).toBe(2)
    expect(week.doneDays).toBe(2)
  })

  it('excludes paused days from the scheduled count entirely', () => {
    const h = habit({
      createdAt: '2025-01-01T00:00:00.000Z',
      pausedFrom: '2026-01-05',
      pausedUntil: '2026-01-07',
    })
    const logs: HabitLog[] = [log('2026-01-04', 'done')]
    const stats = computeCompletionRates([h], new Map([[h.id, logs]]), '2026-01-10')
    const week = stats.find((s) => s.windowDays === 7)!
    // 01-04..01-09 minus the 3 paused days (05,06,07), minus unlogged-today
    // (10) = 3 scheduled days (04, 08, 09).
    expect(week.scheduledDays).toBe(3)
  })

  it('aggregates across multiple habits in the same window', () => {
    const h1 = habit({ id: 'h1', createdAt: '2025-01-01T00:00:00.000Z' })
    const h2 = habit({ id: 'h2', habitType: 'avoid', createdAt: '2025-01-01T00:00:00.000Z' })
    const logs = new Map<string, HabitLog[]>([
      ['h1', [{ id: 'l1', habitId: 'h1', date: '2026-01-10', status: 'done' }]],
      ['h2', [{ id: 'l2', habitId: 'h2', date: '2026-01-10', status: 'not_done' }]],
    ])
    const stats = computeCompletionRates([h1, h2], logs, '2026-01-10')
    const week = stats.find((s) => s.windowDays === 7)!
    expect(week.doneDays).toBe(1)
    expect(week.scheduledDays).toBeGreaterThanOrEqual(2)
  })

  it('returns 0 percent (not NaN) when nothing was ever scheduled in the window', () => {
    const h = habit({ createdAt: '2026-01-10T00:00:00.000Z' })
    const stats = computeCompletionRates([h], new Map([[h.id, []]]), '2026-01-10')
    const week = stats.find((s) => s.windowDays === 7)!
    // Habit was created today and has no log yet — today doesn't count
    // until logged, so there's genuinely nothing scheduled in the window.
    expect(week.scheduledDays).toBe(0)
    expect(week.percent).toBe(0)
    expect(Number.isNaN(week.percent)).toBe(false)
  })
})

describe('computeDomainHabitStrength (E.6)', () => {
  it('splits build and avoid averages within the same domain', () => {
    const habits = [
      habit({ id: 'b1', domainId: 'dom-1', habitType: 'build', createdAt: '2025-01-01T00:00:00.000Z' }),
      habit({ id: 'a1', domainId: 'dom-1', habitType: 'avoid', createdAt: '2025-01-01T00:00:00.000Z' }),
    ]
    const logs = new Map<string, HabitLog[]>([
      ['b1', [log('2026-01-10', 'done')]],
      ['a1', []],
    ])
    const rows = computeDomainHabitStrength(habits, logs, '2026-01-10')
    expect(rows).toHaveLength(1)
    expect(rows[0].domainId).toBe('dom-1')
    expect(rows[0].buildCount).toBe(1)
    expect(rows[0].avoidCount).toBe(1)
    expect(rows[0].buildAvg).not.toBeNull()
    expect(rows[0].avoidAvg).not.toBeNull()
  })

  it('buckets habits with no domainId under a null-key group, not silently dropped', () => {
    const habits = [habit({ id: 'h1', domainId: undefined })]
    const rows = computeDomainHabitStrength(habits, new Map([['h1', []]]), '2026-01-10')
    expect(rows).toHaveLength(1)
    expect(rows[0].domainId).toBeNull()
  })

  it('leaves the unused type average as null rather than 0, so it can be distinguished from "scored zero"', () => {
    const habits = [habit({ id: 'b1', domainId: 'dom-1', habitType: 'build' })]
    const rows = computeDomainHabitStrength(habits, new Map([['b1', []]]), '2026-01-10')
    expect(rows[0].avoidAvg).toBeNull()
    expect(rows[0].avoidCount).toBe(0)
  })
})

describe('computeTaskRatio (E.6)', () => {
  function todo(status: Todo['status'], id: string): Todo {
    return { id, spaceId: 'space-1', title: 't', criticalReminder: false, status, createdAt: '2026-01-01T00:00:00.000Z' }
  }

  it('counts each status bucket plus a total', () => {
    const todos = [todo('open', 't1'), todo('open', 't2'), todo('done', 't3'), todo('someday', 't4')]
    expect(computeTaskRatio(todos)).toEqual({ open: 2, done: 1, someday: 1, archived: 0, total: 4 })
  })

  it('returns all zeros for an empty list, not undefined/NaN', () => {
    expect(computeTaskRatio([])).toEqual({ open: 0, done: 0, someday: 0, archived: 0, total: 0 })
  })
})

describe('computeMoodCorrelationByHabit (E.6/Article 35)', () => {
  it('delegates per habit and returns null for habits below the sample threshold', () => {
    const habits = [habit({ id: 'h1' }), habit({ id: 'h2', name: 'Run' })]
    const enoughMoodLogs: HabitLog[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, habitId: 'h1', date: `2026-01-0${i + 1}`, status: 'done' as const, mood: 8 })),
      ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, habitId: 'h1', date: `2026-02-0${i + 1}`, status: 'not_done' as const, mood: 4 })),
    ]
    const logs = new Map<string, HabitLog[]>([
      ['h1', enoughMoodLogs],
      ['h2', [{ id: 'x', habitId: 'h2', date: '2026-01-01', status: 'done', mood: 9 }]],
    ])
    const rows = computeMoodCorrelationByHabit(habits, logs)
    expect(rows.find((r) => r.habitId === 'h1')?.correlation).not.toBeNull()
    expect(rows.find((r) => r.habitId === 'h2')?.correlation).toBeNull()
  })
})
