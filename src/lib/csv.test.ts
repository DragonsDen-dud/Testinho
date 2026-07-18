import { describe, expect, it } from 'vitest'
import { buildHabitLogCsv } from './csv'
import type { Habit, HabitLog } from '../db/types'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    spaceId: 's1',
    name: 'Read',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildHabitLogCsv (Article 55)', () => {
  it('produces the correct header row', () => {
    const { csv } = buildHabitLogCsv(habit(), [])
    expect(csv.split('\r\n')[0]).toBe('date,status,value,note,mood')
  })

  it('produces one row per HabitLog, sorted by date ascending', () => {
    const logs: HabitLog[] = [
      { id: 'l2', habitId: 'habit-1', date: '2026-07-02', status: 'done' },
      { id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'not_done' },
    ]
    const { csv } = buildHabitLogCsv(habit(), logs)
    const lines = csv.trim().split('\r\n')
    expect(lines[1]).toBe('2026-07-01,not_done,,,')
    expect(lines[2]).toBe('2026-07-02,done,,,')
  })

  it('leaves the value column empty for non-measurable habits even if entries somehow exist', () => {
    const logs: HabitLog[] = [
      { id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'done', entries: [{ timestamp: '2026-07-01T08:00:00.000Z', value: 3 }] },
    ]
    const { csv } = buildHabitLogCsv(habit({ habitType: 'build' }), logs)
    expect(csv.trim().split('\r\n')[1]).toBe('2026-07-01,done,,,')
  })

  it('packs every entry of a measurable habit into the value column, not just the first', () => {
    const measurable = habit({ measurable: { targetValue: 5, unit: 'pages' } })
    const logs: HabitLog[] = [
      {
        id: 'l1',
        habitId: 'habit-1',
        date: '2026-07-01',
        status: 'done',
        entries: [
          { timestamp: '2026-07-01T08:00:00.000Z', value: 3 },
          { timestamp: '2026-07-01T20:00:00.000Z', value: 2 },
        ],
      },
    ]
    const { csv } = buildHabitLogCsv(measurable, logs)
    const row = csv.trim().split('\r\n')[1]
    expect(row).toContain('2026-07-01T08:00:00.000Z=3')
    expect(row).toContain('2026-07-01T20:00:00.000Z=2')
  })

  it('includes mood when set', () => {
    const logs: HabitLog[] = [{ id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'done', mood: 2 }]
    const { csv } = buildHabitLogCsv(habit(), logs)
    expect(csv.trim().split('\r\n')[1]).toBe('2026-07-01,done,,,2')
  })

  it('quotes a note containing a comma', () => {
    const logs: HabitLog[] = [{ id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'done', note: 'tired, but did it' }]
    const { csv } = buildHabitLogCsv(habit(), logs)
    expect(csv.trim().split('\r\n')[1]).toBe('2026-07-01,done,,"tired, but did it",')
  })

  it('quotes and doubles internal quotes in a note', () => {
    const logs: HabitLog[] = [{ id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'done', note: 'felt "great" today' }]
    const { csv } = buildHabitLogCsv(habit(), logs)
    expect(csv.trim().split('\r\n')[1]).toBe('2026-07-01,done,,"felt ""great"" today",')
  })

  it('quotes a note containing a newline, and the embedded newline does not create a spurious extra row', () => {
    const logs: HabitLog[] = [{ id: 'l1', habitId: 'habit-1', date: '2026-07-01', status: 'done', note: 'line one\nline two' }]
    const { csv } = buildHabitLogCsv(habit(), logs)
    const dataLines = csv.trim().split('\r\n')
    // Header + exactly one data "line" at the CSV-row level, even though
    // that row's quoted field itself contains a raw \n character.
    expect(dataLines).toHaveLength(2)
    expect(dataLines[1]).toBe('2026-07-01,done,,"line one\nline two",')
  })

  it('produces a filename derived from the sanitized habit name', () => {
    const { filename } = buildHabitLogCsv(habit({ name: 'Read: daily!' }), [])
    expect(filename).toBe('Read daily-history.csv')
  })
})
