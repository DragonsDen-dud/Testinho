import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { upsertWeeklyAutoStats, upsertMonthlyAutoStats, markDiagnosticViewed } from './diagnostics'
import { createHabit, logHabit } from './habits'
import type { DiagnosticEntry } from '../db/types'

const SPACE_ID = 'space-1'

beforeEach(async () => {
  await db.habits.clear()
  await db.habitLogs.clear()
  await db.diagnosticEntries.clear()
  await db.timeBlocks.clear()
})

describe('upsertWeeklyAutoStats (Articles 26/35)', () => {
  it('creates one DiagnosticEntry per Space+week with an entry per habit', async () => {
    const habit = await createHabit({
      spaceId: SPACE_ID,
      name: 'Read',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
    })
    await logHabit(habit.id, '2026-07-16', 'done')

    const entry = await upsertWeeklyAutoStats(SPACE_ID, '2026-07-16')

    expect(entry.spaceId).toBe(SPACE_ID)
    expect(entry.scope).toBe('week')
    expect(entry.periodStart).toBe('2026-07-13') // the Monday of that week
    expect(entry.periodEnd).toBe('2026-07-19')
    expect(Object.keys(entry.autoStats)).toContain(habit.id)
  })

  it('upserts in place for the same Space+week rather than duplicating rows', async () => {
    await upsertWeeklyAutoStats(SPACE_ID, '2026-07-14') // Tuesday of the same week
    await upsertWeeklyAutoStats(SPACE_ID, '2026-07-16') // Thursday of the same week

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(rows).toHaveLength(1)
  })

  it('creates a separate entry for a different week', async () => {
    await upsertWeeklyAutoStats(SPACE_ID, '2026-07-16')
    await upsertWeeklyAutoStats(SPACE_ID, '2026-07-23')

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(rows).toHaveLength(2)
  })

  it('preserves existing userFeedback/aiInsight when refreshing autoStats on an existing entry', async () => {
    const first = await upsertWeeklyAutoStats(SPACE_ID, '2026-07-16')
    await db.diagnosticEntries.update(first.id, { userFeedback: 'felt good this week', aiInsight: 'some insight' })

    const second = await upsertWeeklyAutoStats(SPACE_ID, '2026-07-17')

    expect(second.id).toBe(first.id)
    expect(second.userFeedback).toBe('felt good this week')
    expect(second.aiInsight).toBe('some insight')
  })
})

describe('upsertMonthlyAutoStats (Article 12 month scope)', () => {
  it('creates one DiagnosticEntry per Space+month, keyed to calendar-month bounds', async () => {
    const habit = await createHabit({
      spaceId: SPACE_ID,
      name: 'Read',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
    })
    await logHabit(habit.id, '2026-07-16', 'done')

    const entry = await upsertMonthlyAutoStats(SPACE_ID, '2026-07-16')

    expect(entry.spaceId).toBe(SPACE_ID)
    expect(entry.scope).toBe('month')
    expect(entry.periodStart).toBe('2026-07-01')
    expect(entry.periodEnd).toBe('2026-07-31')
    expect(Object.keys(entry.autoStats)).toContain(habit.id)
  })

  it('upserts in place for the same Space+month rather than duplicating rows', async () => {
    await upsertMonthlyAutoStats(SPACE_ID, '2026-07-05')
    await upsertMonthlyAutoStats(SPACE_ID, '2026-07-25')

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(rows).toHaveLength(1)
  })

  it('creates a separate entry for a different month', async () => {
    await upsertMonthlyAutoStats(SPACE_ID, '2026-07-16')
    await upsertMonthlyAutoStats(SPACE_ID, '2026-08-16')

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(rows).toHaveLength(2)
  })

  it('week and month entries for the same asOfDate coexist as separate rows, not clobbering each other', async () => {
    await upsertWeeklyAutoStats(SPACE_ID, '2026-07-16')
    await upsertMonthlyAutoStats(SPACE_ID, '2026-07-16')

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.scope).sort()).toEqual(['month', 'week'])
  })
})

function scheduledEntry(overrides: Partial<DiagnosticEntry> = {}): DiagnosticEntry {
  return {
    id: 'entry-1',
    spaceId: SPACE_ID,
    periodStart: '2026-07-13',
    periodEnd: '2026-07-19',
    scope: 'week',
    autoStats: {},
    userFeedback: '',
    aiInsight: 'You did great this week.',
    reportType: 'scheduled_template',
    includedNorthStarContext: false,
    generatedBy: 'scheduled',
    ...overrides,
  }
}

describe('markDiagnosticViewed (Article 12 — Analytics unviewed-report badge)', () => {
  it('sets viewedAt on a not-yet-viewed entry', async () => {
    await db.diagnosticEntries.put(scheduledEntry())

    await markDiagnosticViewed('entry-1')

    const updated = await db.diagnosticEntries.get('entry-1')
    expect(updated?.viewedAt).toBeTruthy()
  })

  it('does not overwrite an already-set viewedAt on a second call', async () => {
    await db.diagnosticEntries.put(scheduledEntry({ viewedAt: '2026-07-14T08:00:00.000Z' }))

    await markDiagnosticViewed('entry-1')

    const updated = await db.diagnosticEntries.get('entry-1')
    expect(updated?.viewedAt).toBe('2026-07-14T08:00:00.000Z')
  })

  it('is a no-op for a nonexistent id, not a throw', async () => {
    await expect(markDiagnosticViewed('missing-id')).resolves.toBeUndefined()
  })
})
