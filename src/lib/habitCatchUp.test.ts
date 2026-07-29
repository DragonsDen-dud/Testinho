import { describe, expect, it } from 'vitest'
import { computeCatchUpDays, countCatchUpPending, CATCH_UP_LOOKBACK_DAYS } from './habitCatchUp'
import { computeBuildStreak } from './habitStrength'
import type { Habit, HabitLog } from '../db/types'

function dailyHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    spaceId: 's1',
    name: 'Read',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function log(habitId: string, date: string, status: HabitLog['status']): HabitLog {
  return { id: `${habitId}-${date}`, habitId, date, status }
}

describe('computeCatchUpDays', () => {
  it('lists a past day with a scheduled, unlogged habit as pending, most-recent-first', () => {
    const habit = dailyHabit()
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.length).toBe(CATCH_UP_LOOKBACK_DAYS)
    expect(days[0].date).toBe('2026-06-09')
    expect(days[0].habits.map((h) => h.id)).toEqual(['h1'])
  })

  it('a day with a log of any status (done/not_done/skip) is not pending', () => {
    const habit = dailyHabit()
    const logsByHabit = new Map([['h1', [log('h1', '2026-06-09', 'skip')]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.find((d) => d.date === '2026-06-09')).toBeUndefined()
  })

  it('never includes today', () => {
    const habit = dailyHabit()
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.find((d) => d.date === '2026-06-10')).toBeUndefined()
  })

  it('excludes a date before the habit existed', () => {
    const habit = dailyHabit({ createdAt: '2026-06-08T00:00:00.000Z' })
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.find((d) => d.date === '2026-06-07')).toBeUndefined()
    expect(days.find((d) => d.date === '2026-06-08')).toBeDefined()
  })

  it('excludes a date the habit was paused', () => {
    const habit = dailyHabit({ pausedFrom: '2026-06-08', pausedUntil: '2026-06-09' })
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.find((d) => d.date === '2026-06-08')).toBeUndefined()
    expect(days.find((d) => d.date === '2026-06-09')).toBeUndefined()
  })

  it('excludes a measurable habit entirely (no backdated not-done precedent)', () => {
    const habit = dailyHabit({ measurable: { targetValue: 8, unit: 'glasses' } })
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.length).toBe(0)
  })

  it('excludes a weekday the habit is not scheduled on (specific_weekdays)', () => {
    // 2026-06-09 is a Tuesday (dow 2); habit only scheduled on Mondays (dow 1).
    const habit = dailyHabit({ schedule: { type: 'specific_weekdays', params: { weekdays: [1] } } })
    const logsByHabit = new Map([['h1', [] as HabitLog[]]])
    const days = computeCatchUpDays([habit], logsByHabit, '2026-06-10')
    expect(days.find((d) => d.date === '2026-06-09')).toBeUndefined()
  })
})

describe('countCatchUpPending', () => {
  it('sums habits across all pending days, not the number of days', () => {
    const days = [
      { date: '2026-06-09', habits: [dailyHabit({ id: 'a' }), dailyHabit({ id: 'b' })] },
      { date: '2026-06-08', habits: [dailyHabit({ id: 'a' })] },
    ]
    expect(countCatchUpPending(days)).toBe(3)
  })
})

describe('streak recalculation across a backdated catch-up fix (Habit catch-up round)', () => {
  it('a broken streak from a missed day is fully restored once that day is backdated to done', () => {
    const habit = dailyHabit({ createdAt: '2026-06-01T00:00:00.000Z' })
    const logsBeforeFix: HabitLog[] = [
      log('h1', '2026-06-01', 'done'),
      log('h1', '2026-06-02', 'done'),
      log('h1', '2026-06-03', 'done'),
      // 2026-06-04 missing entirely — this is the day that gets backdated.
      log('h1', '2026-06-05', 'done'),
    ]
    // Before the fix: walking back from 06-05, the streak stops the moment
    // it hits the unlogged 06-04, so only 06-05 itself counts.
    expect(computeBuildStreak(habit, logsBeforeFix, '2026-06-05')).toBe(1)

    // Backdate exactly the way the catch-up UI does: the same logHabit
    // write path, just with a historical date instead of today's.
    const logsAfterFix: HabitLog[] = [...logsBeforeFix, log('h1', '2026-06-04', 'done')]

    // After the fix: streak calculation needs no special-casing at all —
    // it's already fully date-driven (walks HabitLog.date backward from
    // asOfDate, see habitStrength.ts), so simply having the backdated log
    // present is sufficient for it to reflect continuity correctly.
    expect(computeBuildStreak(habit, logsAfterFix, '2026-06-05')).toBe(5)
  })

  it('backdating a day to not_done correctly still breaks the streak at that day, not silently fixes it', () => {
    const habit = dailyHabit({ createdAt: '2026-06-01T00:00:00.000Z' })
    const logs: HabitLog[] = [
      log('h1', '2026-06-01', 'done'),
      log('h1', '2026-06-02', 'done'),
      log('h1', '2026-06-03', 'done'),
      log('h1', '2026-06-04', 'not_done'),
      log('h1', '2026-06-05', 'done'),
    ]
    // Streak only reflects the unbroken run since the explicit miss.
    expect(computeBuildStreak(habit, logs, '2026-06-05')).toBe(1)
  })
})
