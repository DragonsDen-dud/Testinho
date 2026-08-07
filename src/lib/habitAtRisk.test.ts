import { describe, expect, it } from 'vitest'
import { computeAtRiskHabit } from './habitAtRisk'
import type { Habit, HabitLog, HabitLogStatus, HabitType } from '../db/types'

const AS_OF = '2026-07-16' // a Thursday

function habit(id: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id,
    spaceId: 'space-1',
    name: id,
    habitType: 'build' as HabitType,
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function log(habitId: string, date: string, status: HabitLogStatus): HabitLog {
  return { id: `${habitId}-${date}`, habitId, date, status }
}

/** Logs for the N days immediately before AS_OF, newest first. */
function recentDays(count: number): string[] {
  const days: string[] = []
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(Date.UTC(2026, 6, 16))
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function logsFor(habitId: string, statuses: HabitLogStatus[]): HabitLog[] {
  return recentDays(statuses.length).map((date, i) => log(habitId, date, statuses[i]))
}

describe('computeAtRiskHabit — build habits', () => {
  it('returns null when there is not enough history to say anything honest', () => {
    const h = habit('a', { createdAt: '2026-07-14T00:00:00.000Z' })
    // Only 2 scheduled days exist before today — under the 4-observation floor.
    expect(computeAtRiskHabit([h], new Map([['a', []]]), AS_OF)).toBeNull()
  })

  it('returns null for a habit that is mostly getting done', () => {
    const h = habit('a')
    // The whole window has to be accounted for: an unlogged day is a miss
    // for a build habit, so 13 done + 1 explicit miss out of 14 = 93%.
    const statuses = ['not_done', ...Array(13).fill('done')] as HabitLogStatus[]
    expect(computeAtRiskHabit([h], new Map([['a', logsFor('a', statuses)]]), AS_OF)).toBeNull()
  })

  it('flags a habit that is being missed, counting unlogged days as misses', () => {
    const h = habit('a')
    // 7 scheduled days: 2 done, 1 explicit not_done, 4 never logged.
    const logs = logsFor('a', ['done', 'not_done', 'done'])
    const result = computeAtRiskHabit([h], new Map([['a', logs]]), AS_OF)
    expect(result).not.toBeNull()
    expect(result!.habitId).toBe('a')
    // The window is 14 days, all scheduled (daily): 2 done out of 14.
    expect(result!.observedDays).toBe(14)
    expect(result!.missedDays).toBe(12)
    expect(result!.completionPercent).toBe(14)
  })

  it('never counts today as a miss — only the days before it', () => {
    const h = habit('a')
    // Every past day done; today deliberately unlogged.
    const logs = logsFor('a', Array(14).fill('done') as HabitLogStatus[])
    expect(computeAtRiskHabit([h], new Map([['a', logs]]), AS_OF)).toBeNull()
  })

  it('excludes skip days from the denominator entirely', () => {
    const h = habit('a')
    // 4 done, 10 skipped → 100% of what actually counted.
    const statuses = [...Array(4).fill('done'), ...Array(10).fill('skip')] as HabitLogStatus[]
    const result = computeAtRiskHabit([h], new Map([['a', logsFor('a', statuses)]]), AS_OF)
    expect(result).toBeNull()
  })

  it('excludes paused days, so a habit resumed from a pause is not instantly flagged', () => {
    const h = habit('a', { pausedFrom: '2026-07-03', pausedUntil: '2026-07-15' })
    // Nothing logged at all, but every day in the window is paused except
    // the 2nd — under the observation floor, so nothing is claimed.
    expect(computeAtRiskHabit([h], new Map([['a', []]]), AS_OF)).toBeNull()
  })

  it('only counts days the habit is actually scheduled for', () => {
    // Mondays only. In a 14-day window that is 2 days — under the floor,
    // so a weekday-limited habit is never flagged on thin evidence.
    const h = habit('a', { schedule: { type: 'specific_weekdays', params: { weekdays: [1] } } })
    expect(computeAtRiskHabit([h], new Map([['a', []]]), AS_OF)).toBeNull()
  })

  it('never looks back past the habit\'s own creation date', () => {
    const h = habit('a', { createdAt: '2026-07-11T00:00:00.000Z' })
    const result = computeAtRiskHabit([h], new Map([['a', []]]), AS_OF)
    // 2026-07-11 .. 2026-07-15 inclusive = 5 observed days, all missed.
    expect(result!.observedDays).toBe(5)
    expect(result!.missedDays).toBe(5)
  })
})

describe('computeAtRiskHabit — avoid habits (Article 14 polarity)', () => {
  it('treats an unlogged day as a success, not a relapse', () => {
    const h = habit('a', { habitType: 'avoid' })
    // Nothing logged at all: for an avoid habit that means no relapses.
    expect(computeAtRiskHabit([h], new Map([['a', []]]), AS_OF)).toBeNull()
  })

  it('flags an avoid habit on explicit relapses', () => {
    const h = habit('a', { habitType: 'avoid' })
    const statuses = Array(10).fill('not_done') as HabitLogStatus[]
    const result = computeAtRiskHabit([h], new Map([['a', logsFor('a', statuses)]]), AS_OF)
    expect(result).not.toBeNull()
    expect(result!.missedDays).toBe(10)
    expect(result!.observedDays).toBe(14)
  })
})

describe('computeAtRiskHabit — picking one habit', () => {
  it('picks the lowest completion rate among several qualifying habits', () => {
    const worse = habit('worse')
    const bad = habit('bad')
    const fine = habit('fine')
    const logs = new Map([
      ['worse', logsFor('worse', ['done'])], // 1/14
      ['bad', logsFor('bad', Array(7).fill('done') as HabitLogStatus[])], // 7/14
      ['fine', logsFor('fine', Array(14).fill('done') as HabitLogStatus[])], // 14/14
    ])
    const result = computeAtRiskHabit([worse, bad, fine], logs, AS_OF)
    expect(result!.habitId).toBe('worse')
  })

  it('is deterministic on identical data rather than shuffling between renders', () => {
    const a = habit('a')
    const b = habit('b')
    const logs = new Map([
      ['a', logsFor('a', ['done'])],
      ['b', logsFor('b', ['done'])],
    ])
    expect(computeAtRiskHabit([a, b], logs, AS_OF)!.habitId).toBe('a')
    expect(computeAtRiskHabit([b, a], logs, AS_OF)!.habitId).toBe('a')
  })

  it('returns null for an empty habit list', () => {
    expect(computeAtRiskHabit([], new Map(), AS_OF)).toBeNull()
  })

  it('tolerates a habit with a missing createdAt without throwing (black-screen guard)', () => {
    const broken = habit('broken', { createdAt: undefined as unknown as string })
    expect(() => computeAtRiskHabit([broken], new Map([['broken', []]]), AS_OF)).not.toThrow()
  })
})
