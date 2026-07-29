import { describe, expect, it } from 'vitest'
import { computeHabitStrength, computeBuildStreak, computeAvoidStreak, isPausedOnDate, isScheduledOnDate } from './habitStrength'
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

describe('isPausedOnDate (Article 21)', () => {
  it('is false when no pause window is set', () => {
    expect(isPausedOnDate(dailyHabit(), '2026-06-15')).toBe(false)
  })

  it('is true for dates inside an inclusive [pausedFrom, pausedUntil] window', () => {
    const habit = dailyHabit({ pausedFrom: '2026-06-10', pausedUntil: '2026-06-20' })
    expect(isPausedOnDate(habit, '2026-06-09')).toBe(false)
    expect(isPausedOnDate(habit, '2026-06-10')).toBe(true)
    expect(isPausedOnDate(habit, '2026-06-15')).toBe(true)
    expect(isPausedOnDate(habit, '2026-06-20')).toBe(true)
    expect(isPausedOnDate(habit, '2026-06-21')).toBe(false)
  })
})

describe('isScheduledOnDate honors pause', () => {
  it('a paused day is never scheduled, regardless of schedule type', () => {
    const habit = dailyHabit({ pausedFrom: '2026-06-10', pausedUntil: '2026-06-20' })
    expect(isScheduledOnDate(habit, '2026-06-15')).toBe(false)
  })
})

describe('computeHabitStrength freezes during pause (Article 21)', () => {
  it('strength does not move across the pause window — same value at pausedFrom and pausedUntil', () => {
    const habit = dailyHabit({
      createdAt: '2026-06-01T00:00:00.000Z',
      pausedFrom: '2026-06-10',
      pausedUntil: '2026-06-20',
    })
    const logs: HabitLog[] = [
      log('h1', '2026-06-01', 'done'),
      log('h1', '2026-06-02', 'done'),
      log('h1', '2026-06-03', 'done'),
      log('h1', '2026-06-04', 'done'),
      log('h1', '2026-06-05', 'done'),
    ]
    // Comparing the two pause boundaries (rather than a pre-pause day vs a
    // post-pause day) isolates the freeze from the unrelated "today with no
    // log yet is neutral" rule, which would otherwise confound the diff.
    const strengthAtPauseStart = computeHabitStrength(habit, logs, '2026-06-10')
    const strengthAtPauseEnd = computeHabitStrength(habit, logs, '2026-06-20')

    expect(strengthAtPauseEnd).toBe(strengthAtPauseStart)
  })

  it('a fully-paused week never moves strength for a weekly_n_times habit', () => {
    const habit = dailyHabit({
      createdAt: '2026-06-01T00:00:00.000Z',
      schedule: { type: 'weekly_n_times', params: { n: 3 } },
      pausedFrom: '2026-06-08',
      pausedUntil: '2026-06-14',
    })
    const logs: HabitLog[] = [
      log('h1', '2026-06-01', 'done'),
      log('h1', '2026-06-02', 'done'),
      log('h1', '2026-06-03', 'done'),
    ]
    const strengthAtPauseStart = computeHabitStrength(habit, logs, '2026-06-08')
    const strengthAtPauseEnd = computeHabitStrength(habit, logs, '2026-06-14')

    expect(strengthAtPauseEnd).toBe(strengthAtPauseStart)
  })
})

describe('computeBuildStreak treats paused days like skip — no break, no extend', () => {
  it('a streak survives a pause window with no logs inside it', () => {
    const habit = dailyHabit({
      createdAt: '2026-06-01T00:00:00.000Z',
      pausedFrom: '2026-06-05',
      pausedUntil: '2026-06-10',
    })
    const logs: HabitLog[] = [
      log('h1', '2026-06-01', 'done'),
      log('h1', '2026-06-02', 'done'),
      log('h1', '2026-06-03', 'done'),
      log('h1', '2026-06-04', 'done'),
    ]
    // asOf mid-pause: paused days are skipped by isScheduledOnDate, so the
    // streak walk should still find the 4 done days intact.
    expect(computeBuildStreak(habit, logs, '2026-06-10')).toBe(4)
  })
})

describe('malformed/missing createdAt does not crash (black-screen incident)', () => {
  // A real habit turning up with an undefined createdAt crashed the whole
  // app with an uncaught TypeError in production — createdAt is typed as
  // always a string, but nothing at the IndexedDB boundary actually
  // guarantees that for real/legacy/imported data. These lock in the fix:
  // every function below must degrade gracefully, never throw.
  const habitWithBadCreatedAt = dailyHabit({ createdAt: undefined as unknown as string })

  it('computeHabitStrength does not throw and returns a number', () => {
    expect(() => computeHabitStrength(habitWithBadCreatedAt, [], '2026-06-15')).not.toThrow()
    expect(typeof computeHabitStrength(habitWithBadCreatedAt, [], '2026-06-15')).toBe('number')
  })

  it('computeHabitStrength does not throw for a weekly_n_times habit either', () => {
    const habit = dailyHabit({
      createdAt: undefined as unknown as string,
      schedule: { type: 'weekly_n_times', params: { n: 3 } },
    })
    expect(() => computeHabitStrength(habit, [], '2026-06-15')).not.toThrow()
  })

  it('computeBuildStreak does not throw and returns a number', () => {
    expect(() => computeBuildStreak(habitWithBadCreatedAt, [], '2026-06-15')).not.toThrow()
    expect(typeof computeBuildStreak(habitWithBadCreatedAt, [], '2026-06-15')).toBe('number')
  })

  it('computeAvoidStreak does not throw and returns a number', () => {
    expect(() => computeAvoidStreak(habitWithBadCreatedAt, [], '2026-06-15')).not.toThrow()
    expect(typeof computeAvoidStreak(habitWithBadCreatedAt, [], '2026-06-15')).toBe('number')
  })
})
