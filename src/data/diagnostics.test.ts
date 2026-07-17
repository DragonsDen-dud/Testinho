import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { upsertWeeklyAutoStats } from './diagnostics'
import { createHabit, logHabit } from './habits'

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
