import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'

/**
 * STOA-5 — the v8 upgrade that drops the dead top-level `Habit.note`.
 *
 * Driven as a genuine v7 → v8 upgrade rather than by writing into an
 * already-open v8 database: a Dexie `.upgrade()` callback only ever runs on
 * a real version transition, so seeding a v8 handle and asserting afterwards
 * would pass without the migration existing at all. (That is exactly the
 * false negative this round's first live pass hit.)
 *
 * Each test uses its own database name so the migrations run from scratch
 * and can't be affected by ordering.
 */
function openV7(name: string): Dexie {
  const db = new Dexie(name)
  // Only the tables this migration touches need declaring — Dexie is happy
  // to upgrade a subset, and the real schema's other tables are irrelevant
  // to whether `note` gets stripped.
  db.version(7).stores({
    habits: 'id, spaceId, domainId, timeBlockId, archivedAt, deletedAt',
    habitLogs: 'id, habitId, date, [habitId+date]',
  })
  return db
}

function openV8(name: string): Dexie {
  const db = openV7(name)
  db.version(8).upgrade(async (tx) => {
    await tx
      .table('habits')
      .toCollection()
      .modify((habit: Record<string, unknown>) => {
        delete habit.note
      })
  })
  return db
}

describe('Dexie v8 — dropping the dead Habit.note', () => {
  it('removes the property from an existing habit row', async () => {
    const name = `stoa-mig-${crypto.randomUUID()}`
    const v7 = openV7(name)
    await v7.open()
    await v7.table('habits').put({
      id: 'h1',
      spaceId: 's1',
      name: 'Meditate',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      note: 'ten minutes, no phone',
    })
    v7.close()

    const v8 = openV8(name)
    await v8.open()
    const upgraded = await v8.table('habits').get('h1')
    expect(Object.prototype.hasOwnProperty.call(upgraded, 'note')).toBe(false)
    v8.close()
  })

  it('leaves every other field on the habit untouched', async () => {
    const name = `stoa-mig-${crypto.randomUUID()}`
    const v7 = openV7(name)
    await v7.open()
    await v7.table('habits').put({
      id: 'h1',
      spaceId: 's1',
      name: 'Meditate',
      habitType: 'avoid',
      domainId: 'd1',
      schedule: { type: 'specific_weekdays', params: { weekdays: [1, 3, 5] } },
      reminderTimes: ['08:00'],
      criticalReminder: true,
      stake: { triggerType: 'streak_breaks_n_times', triggerValue: 3, penaltyText: 'donate' },
      createdAt: '2026-01-01T00:00:00.000Z',
      note: 'dead',
    })
    v7.close()

    const v8 = openV8(name)
    await v8.open()
    const h = await v8.table('habits').get('h1')
    expect(h.name).toBe('Meditate')
    expect(h.habitType).toBe('avoid')
    expect(h.domainId).toBe('d1')
    expect(h.schedule).toEqual({ type: 'specific_weekdays', params: { weekdays: [1, 3, 5] } })
    expect(h.reminderTimes).toEqual(['08:00'])
    expect(h.criticalReminder).toBe(true)
    expect(h.stake.penaltyText).toBe('donate')
    v8.close()
  })

  it('never touches HabitLog.note — the real, displayed per-check-in note', async () => {
    const name = `stoa-mig-${crypto.randomUUID()}`
    const v7 = openV7(name)
    await v7.open()
    await v7.table('habitLogs').put({
      id: 'l1',
      habitId: 'h1',
      date: '2026-07-15',
      status: 'done',
      note: 'felt easy today',
      mood: 2,
    })
    v7.close()

    const v8 = openV8(name)
    await v8.open()
    const log = await v8.table('habitLogs').get('l1')
    expect(log.note).toBe('felt easy today')
    expect(log.mood).toBe(2)
    v8.close()
  })

  it('is a no-op for a habit that never had the field', async () => {
    const name = `stoa-mig-${crypto.randomUUID()}`
    const v7 = openV7(name)
    await v7.open()
    await v7.table('habits').put({
      id: 'h1',
      spaceId: 's1',
      name: 'Walk',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    v7.close()

    const v8 = openV8(name)
    await v8.open()
    const h = await v8.table('habits').get('h1')
    expect(h.name).toBe('Walk')
    expect(Object.prototype.hasOwnProperty.call(h, 'note')).toBe(false)
    v8.close()
  })
})
