import { describe, expect, it } from 'vitest'
import { buildDayStrip, DAY_STRIP_DAYS } from './dayStrip'
import type { Habit, HabitLog } from '../db/types'

const base = {
  spaceId: 's',
  reminderTimes: [],
  criticalReminder: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function daily(id: string, habitType: 'build' | 'avoid' = 'build'): Habit {
  return { ...base, id, name: id, habitType, schedule: { type: 'daily', params: {} } } as Habit
}

function log(habitId: string, date: string, status: 'done' | 'not_done' | 'skip'): HabitLog {
  return { id: `${habitId}-${date}`, habitId, date, status, createdAt: '', updatedAt: '' } as HabitLog
}

describe('buildDayStrip', () => {
  it('returns seven days ending on the as-of date, oldest first', () => {
    const strip = buildDayStrip([daily('a')], new Map(), '2026-08-08')
    expect(strip).toHaveLength(DAY_STRIP_DAYS)
    expect(strip[0].date).toBe('2026-08-02')
    expect(strip[6].date).toBe('2026-08-08')
    expect(strip[6].isToday).toBe(true)
    expect(strip.filter((d) => d.isToday)).toHaveLength(1)
  })

  it('counts only habits scheduled on that day', () => {
    const mondays: Habit = {
      ...base,
      id: 'mon',
      name: 'mon',
      habitType: 'build',
      // 2026-08-03 is a Monday.
      schedule: { type: 'specific_weekdays', params: { weekdays: [1] } },
    } as Habit
    const strip = buildDayStrip([daily('a'), mondays], new Map(), '2026-08-08')
    const monday = strip.find((d) => d.date === '2026-08-03')!
    const tuesday = strip.find((d) => d.date === '2026-08-04')!
    expect(monday.scheduled).toBe(2)
    expect(tuesday.scheduled).toBe(1)
  })

  it('reports a day with nothing scheduled as a rest day, not as 0%', () => {
    const sundaysOnly: Habit = {
      ...base,
      id: 'sun',
      name: 'sun',
      habitType: 'build',
      schedule: { type: 'specific_weekdays', params: { weekdays: [0] } },
    } as Habit
    const strip = buildDayStrip([sundaysOnly], new Map(), '2026-08-08')
    const saturday = strip.find((d) => d.date === '2026-08-08')!
    expect(saturday.scheduled).toBe(0)
    expect(saturday.restDay).toBe(true)
    // The distinction that matters: a rest day must not render as a failed
    // day. Both have ratio 0, so `restDay` is what the UI branches on.
    expect(saturday.ratio).toBe(0)
  })

  it('counts a completed build habit and ignores an unlogged one', () => {
    const logs = new Map([['a', [log('a', '2026-08-07', 'done')]]])
    const strip = buildDayStrip([daily('a')], logs, '2026-08-08')
    expect(strip.find((d) => d.date === '2026-08-07')!.done).toBe(1)
    expect(strip.find((d) => d.date === '2026-08-06')!.done).toBe(0)
  })

  it('treats an avoid habit as successful when it was NOT done', () => {
    // Article 27 polarity: for an avoid habit, a clean past day counts.
    // Getting this backwards would make the strip read inverted for anyone
    // tracking something they are trying to quit.
    const strip = buildDayStrip([daily('quit', 'avoid')], new Map(), '2026-08-08')
    const yesterday = strip.find((d) => d.date === '2026-08-07')!
    expect(yesterday.done).toBe(1)
    expect(yesterday.ratio).toBe(1)

    // An explicit `done` on an avoid habit is "I abstained", not "I
    // slipped" — that is the app's existing convention (HabitGrid writes
    // `done` on tap for every habit type, and computeAvoidStreak only
    // breaks on `not_done`). So the slip case is `not_done`.
    const abstained = buildDayStrip(
      [daily('quit', 'avoid')],
      new Map([['quit', [log('quit', '2026-08-07', 'done')]]]),
      '2026-08-08',
    )
    expect(abstained.find((d) => d.date === '2026-08-07')!.done).toBe(1)

    const slipped = buildDayStrip(
      [daily('quit', 'avoid')],
      new Map([['quit', [log('quit', '2026-08-07', 'not_done')]]]),
      '2026-08-08',
    )
    expect(slipped.find((d) => d.date === '2026-08-07')!.done).toBe(0)
  })

  it('does not count today as missed just because it is not logged yet', () => {
    // Today is still pending, not failed — otherwise the strip would show
    // the current day as a red 0 every morning.
    const strip = buildDayStrip([daily('a'), daily('b')], new Map(), '2026-08-08')
    const today = strip.find((d) => d.isToday)!
    expect(today.scheduled).toBe(2)
    expect(today.done).toBe(0)
    expect(today.restDay).toBe(false)
  })

  it('computes ratio against scheduled, not against the whole habit list', () => {
    const weekdayOnly: Habit = {
      ...base,
      id: 'w',
      name: 'w',
      habitType: 'build',
      schedule: { type: 'specific_weekdays', params: { weekdays: [1, 2, 3, 4, 5] } },
    } as Habit
    // 2026-08-08 is a Saturday, so only the daily habit is scheduled.
    const logs = new Map([['a', [log('a', '2026-08-08', 'done')]]])
    const strip = buildDayStrip([daily('a'), weekdayOnly], logs, '2026-08-08')
    const today = strip.find((d) => d.isToday)!
    expect(today.scheduled).toBe(1)
    expect(today.ratio).toBe(1)
  })
})
