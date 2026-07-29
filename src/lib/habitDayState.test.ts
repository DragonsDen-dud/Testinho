import { describe, expect, it } from 'vitest'
import { computeHabitDayInfo } from './habitDayState'
import type { Habit, HabitLog } from '../db/types'

function dailyHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    spaceId: 's1',
    name: 'Push-ups',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeHabitDayInfo', () => {
  it('a future date is inactive', () => {
    expect(computeHabitDayInfo(dailyHabit(), undefined, '2026-06-20', '2026-06-15').state).toBe('inactive')
  })

  it('a date before the habit existed is inactive', () => {
    expect(computeHabitDayInfo(dailyHabit(), undefined, '2026-05-20', '2026-06-15').state).toBe('inactive')
  })

  it('a paused date is inactive', () => {
    const habit = dailyHabit({ pausedFrom: '2026-06-10', pausedUntil: '2026-06-20' })
    expect(computeHabitDayInfo(habit, undefined, '2026-06-12', '2026-06-15').state).toBe('inactive')
  })

  it('an unscheduled weekday is inactive', () => {
    const habit = dailyHabit({ schedule: { type: 'specific_weekdays', params: { weekdays: [1, 3, 5] } } })
    // 2026-06-14 is a Sunday, not in [Mon, Wed, Fri]
    expect(computeHabitDayInfo(habit, undefined, '2026-06-14', '2026-06-15').state).toBe('inactive')
  })

  it('today with no log is pending, not missed', () => {
    expect(computeHabitDayInfo(dailyHabit(), undefined, '2026-06-15', '2026-06-15').state).toBe('pending')
  })

  it('a past scheduled day with no log is missed', () => {
    expect(computeHabitDayInfo(dailyHabit(), undefined, '2026-06-10', '2026-06-15').state).toBe('missed')
  })

  it('a logged done day is done', () => {
    const log: HabitLog = { id: 'l1', habitId: 'h1', date: '2026-06-10', status: 'done' }
    expect(computeHabitDayInfo(dailyHabit(), log, '2026-06-10', '2026-06-15').state).toBe('done')
  })

  it('a logged not_done day is not_done', () => {
    const log: HabitLog = { id: 'l1', habitId: 'h1', date: '2026-06-10', status: 'not_done' }
    expect(computeHabitDayInfo(dailyHabit(), log, '2026-06-10', '2026-06-15').state).toBe('not_done')
  })

  it('a skipped day is skip', () => {
    const log: HabitLog = { id: 'l1', habitId: 'h1', date: '2026-06-10', status: 'skip' }
    expect(computeHabitDayInfo(dailyHabit(), log, '2026-06-10', '2026-06-15').state).toBe('skip')
  })

  it('a measurable habit exposes the summed entry value on a done day', () => {
    const habit = dailyHabit({ measurable: { targetValue: 20, unit: 'push-ups' } })
    const log: HabitLog = {
      id: 'l1',
      habitId: 'h1',
      date: '2026-06-10',
      status: 'done',
      entries: [
        { timestamp: 't1', value: 20 },
        { timestamp: 't2', value: 15 },
      ],
    }
    const info = computeHabitDayInfo(habit, log, '2026-06-10', '2026-06-15')
    expect(info.state).toBe('done')
    expect(info.value).toBe(35)
  })

  it('malformed createdAt does not crash and degrades to "no known history" (black-screen-class regression)', () => {
    const habit = dailyHabit({ createdAt: undefined as unknown as string })
    expect(() => computeHabitDayInfo(habit, undefined, '2026-06-10', '2026-06-15')).not.toThrow()
  })
})
