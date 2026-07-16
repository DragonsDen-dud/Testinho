import { describe, expect, it } from 'vitest'
import { unmetDependencyNames, wouldCreateCycle } from './habitDependencies'
import type { Habit, HabitLog } from '../db/types'

function habit(id: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id,
    spaceId: 's1',
    name: id,
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function doneLog(habitId: string): HabitLog {
  return { id: `${habitId}-log`, habitId, date: '2026-06-15', status: 'done' }
}

describe('unmetDependencyNames (Article 25)', () => {
  it('returns an empty list when the habit has no dependencies', () => {
    const meditate = habit('meditate')
    expect(unmetDependencyNames(meditate, [meditate], new Map())).toEqual([])
  })

  it('names prerequisites not yet done today', () => {
    const stretch = habit('stretch', { name: 'Stretch' })
    const meditate = habit('meditate', { name: 'Meditate', dependsOnHabitIds: [stretch.id] })
    const logsToday = new Map<string, HabitLog>()

    expect(unmetDependencyNames(meditate, [stretch, meditate], logsToday)).toEqual(['Stretch'])
  })

  it('drops a prerequisite from the list once it is logged done today', () => {
    const stretch = habit('stretch', { name: 'Stretch' })
    const meditate = habit('meditate', { name: 'Meditate', dependsOnHabitIds: [stretch.id] })
    const logsToday = new Map<string, HabitLog>([[stretch.id, doneLog(stretch.id)]])

    expect(unmetDependencyNames(meditate, [stretch, meditate], logsToday)).toEqual([])
  })

  it('lists multiple unmet prerequisites by name, in order', () => {
    const stretch = habit('stretch', { name: 'Stretch' })
    const journal = habit('journal', { name: 'Journal' })
    const meditate = habit('meditate', {
      name: 'Meditate',
      dependsOnHabitIds: [stretch.id, journal.id],
    })
    const logsToday = new Map<string, HabitLog>([[stretch.id, doneLog(stretch.id)]])

    expect(unmetDependencyNames(meditate, [stretch, journal, meditate], logsToday)).toEqual(['Journal'])
  })
})

describe('wouldCreateCycle (Article 25)', () => {
  it('allows a simple, acyclic dependency', () => {
    const a = habit('a')
    const b = habit('b')
    expect(wouldCreateCycle(a.id, [b.id], [a, b])).toBe(false)
  })

  it('rejects a direct 2-cycle (A depends on B, B already depends on A)', () => {
    const a = habit('a')
    const b = habit('b', { dependsOnHabitIds: ['a'] })
    expect(wouldCreateCycle(a.id, [b.id], [a, b])).toBe(true)
  })

  it('rejects a transitive cycle (candidate A->B, with existing B->C and C->A)', () => {
    const a = habit('a')
    const c = habit('c', { dependsOnHabitIds: ['a'] }) // c -> a
    const b = habit('b', { dependsOnHabitIds: ['c'] }) // b -> c
    // Candidate: a -> b. Combined with existing b -> c -> a, that closes a cycle.
    expect(wouldCreateCycle('a', ['b'], [a, b, c])).toBe(true)
  })

  it('allows a transitive chain that does not loop back (A->B, B->C, C independent)', () => {
    const c = habit('c')
    const b = habit('b', { dependsOnHabitIds: ['c'] }) // b -> c
    const a = habit('a')
    expect(wouldCreateCycle(a.id, ['b'], [a, b, c])).toBe(false)
  })

  it('rejects self-dependency', () => {
    const a = habit('a')
    expect(wouldCreateCycle(a.id, [a.id], [a])).toBe(true)
  })

  it('allows a diamond (A depends on B and C, both depend on D) with no cycle', () => {
    const d = habit('d')
    const b = habit('b', { dependsOnHabitIds: ['d'] })
    const c = habit('c', { dependsOnHabitIds: ['d'] })
    const a = habit('a')
    expect(wouldCreateCycle(a.id, ['b', 'c'], [a, b, c, d])).toBe(false)
  })
})
