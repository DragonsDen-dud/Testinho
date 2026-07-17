import { describe, expect, it } from 'vitest'
import { computeWeekdayPattern, computeTimeOfDayPattern } from './habitPatterns'
import { addDays, weekdayOf } from './date'
import type { Habit, HabitLog, TimeBlock } from '../db/types'

function dailyHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    spaceId: 's1',
    name: 'Test',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function measurableHabit(): Habit {
  return { ...dailyHabit(), measurable: { targetValue: 1, unit: 'x' } }
}

describe('computeWeekdayPattern (Article 26)', () => {
  const asOf = '2026-07-16'

  it('returns null when there is no history at all', () => {
    const habit = dailyHabit({ createdAt: '2026-07-16T00:00:00.000Z' })
    expect(computeWeekdayPattern(habit, [], asOf)).toBeNull()
  })

  it('flags an injected weak weekday (>=30pp below average, >=4 observations)', () => {
    const habit = dailyHabit()
    const logs: HabitLog[] = []
    let cursor = addDays(asOf, -55)
    let i = 0
    while (cursor <= asOf) {
      const dow = weekdayOf(cursor)
      logs.push({ id: `log-${i++}`, habitId: habit.id, date: cursor, status: dow === 2 ? 'not_done' : 'done' })
      cursor = addDays(cursor, 1)
    }

    const pattern = computeWeekdayPattern(habit, logs, asOf)
    expect(pattern).not.toBeNull()
    expect(pattern?.weekday).toBe(2)
    expect(pattern?.rate).toBe(0)
    expect(pattern?.observations).toBeGreaterThanOrEqual(4)
  })

  it('returns null when performance is uniform across all weekdays', () => {
    const habit = dailyHabit()
    const logs: HabitLog[] = []
    let cursor = addDays(asOf, -55)
    let i = 0
    while (cursor <= asOf) {
      logs.push({ id: `log-${i++}`, habitId: habit.id, date: cursor, status: 'done' })
      cursor = addDays(cursor, 1)
    }
    expect(computeWeekdayPattern(habit, logs, asOf)).toBeNull()
  })

  it('does not flag a weak weekday with fewer than 4 observations, even with a 100pp gap', () => {
    const habit = dailyHabit({ createdAt: addDays(asOf, -20) }) // ~3 weeks: at most 3 of any single weekday
    const logs: HabitLog[] = []
    let cursor = habit.createdAt.slice(0, 10)
    let i = 0
    while (cursor <= asOf) {
      const dow = weekdayOf(cursor)
      logs.push({ id: `log-${i++}`, habitId: habit.id, date: cursor, status: dow === 2 ? 'not_done' : 'done' })
      cursor = addDays(cursor, 1)
    }
    expect(computeWeekdayPattern(habit, logs, asOf)).toBeNull()
  })

  it('a skip day is excluded from observations entirely, not counted as a miss', () => {
    const habit = dailyHabit({ createdAt: addDays(asOf, -13) }) // 2 weeks
    const logs: HabitLog[] = []
    let cursor = habit.createdAt.slice(0, 10)
    let i = 0
    while (cursor <= asOf) {
      logs.push({ id: `log-${i++}`, habitId: habit.id, date: cursor, status: 'skip' })
      cursor = addDays(cursor, 1)
    }
    // every day skipped -> zero real observations -> null, not a 0% "weak" verdict
    expect(computeWeekdayPattern(habit, logs, asOf)).toBeNull()
  })
})

describe('computeTimeOfDayPattern (Article 26)', () => {
  const asOf = '2026-07-16'
  const morning: TimeBlock = { id: 'morning', spaceId: 's1', name: 'Morning', sortOrder: 0, approxTimeRange: { start: '06:00', end: '12:00' } }
  const evening: TimeBlock = { id: 'evening', spaceId: 's1', name: 'Evening', sortOrder: 1, approxTimeRange: { start: '18:00', end: '06:00' } }
  const timeBlocks = [morning, evening]

  function entryAt(date: string, hour: number, minute = 0) {
    const [y, m, d] = date.split('-').map(Number)
    return { timestamp: new Date(y, m - 1, d, hour, minute).toISOString(), value: 1 }
  }

  it('returns null for non-measurable habits — no real timestamp evidence, and Habit.timeBlockId alone is not evidence', () => {
    const habit = dailyHabit({ timeBlockId: 'morning' })
    const logs: HabitLog[] = [{ id: 'l1', habitId: habit.id, date: asOf, status: 'done' }]
    expect(computeTimeOfDayPattern(habit, logs, timeBlocks, asOf)).toBeNull()
  })

  it('returns null when no TimeBlock in the space has a structured range', () => {
    const habit = measurableHabit()
    const untimed: TimeBlock = { id: 'x', spaceId: 's1', name: 'X', sortOrder: 0 }
    const logs: HabitLog[] = [{ id: 'l1', habitId: habit.id, date: asOf, status: 'done', entries: [entryAt(asOf, 8)] }]
    expect(computeTimeOfDayPattern(habit, logs, [untimed], asOf)).toBeNull()
  })

  it('returns null with fewer than 4 classified entries', () => {
    const habit = measurableHabit()
    const logs: HabitLog[] = [
      { id: 'l1', habitId: habit.id, date: '2026-07-10', status: 'done', entries: [entryAt('2026-07-10', 7)] },
      { id: 'l2', habitId: habit.id, date: '2026-07-11', status: 'done', entries: [entryAt('2026-07-11', 7)] },
    ]
    expect(computeTimeOfDayPattern(habit, logs, timeBlocks, asOf)).toBeNull()
  })

  it('flags the block with an injected majority share (5 morning, 1 evening)', () => {
    const habit = measurableHabit()
    const logs: HabitLog[] = []
    ;['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'].forEach((date, i) => {
      logs.push({ id: `l${i}`, habitId: habit.id, date, status: 'done', entries: [entryAt(date, 7)] })
    })
    logs.push({ id: 'l-evening', habitId: habit.id, date: '2026-07-15', status: 'done', entries: [entryAt('2026-07-15', 20)] })

    const pattern = computeTimeOfDayPattern(habit, logs, timeBlocks, asOf)
    expect(pattern).not.toBeNull()
    expect(pattern?.timeBlockId).toBe('morning')
  })

  it('returns null when entries are evenly split across blocks', () => {
    const habit = measurableHabit()
    const logs: HabitLog[] = [
      { id: 'l1', habitId: habit.id, date: '2026-07-10', status: 'done', entries: [entryAt('2026-07-10', 7)] },
      { id: 'l2', habitId: habit.id, date: '2026-07-11', status: 'done', entries: [entryAt('2026-07-11', 20)] },
      { id: 'l3', habitId: habit.id, date: '2026-07-12', status: 'done', entries: [entryAt('2026-07-12', 7)] },
      { id: 'l4', habitId: habit.id, date: '2026-07-13', status: 'done', entries: [entryAt('2026-07-13', 20)] },
    ]
    expect(computeTimeOfDayPattern(habit, logs, timeBlocks, asOf)).toBeNull()
  })

  it('classifies a late-night entry into the wrapping Evening block, not as unclassified', () => {
    const habit = measurableHabit()
    const logs: HabitLog[] = []
    ;['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'].forEach((date, i) => {
      logs.push({ id: `l${i}`, habitId: habit.id, date, status: 'done', entries: [entryAt(date, 23, 30)] })
    })
    const pattern = computeTimeOfDayPattern(habit, logs, timeBlocks, asOf)
    expect(pattern?.timeBlockId).toBe('evening')
  })
})
