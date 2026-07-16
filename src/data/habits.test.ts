import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  createHabit,
  listActiveHabits,
  listTrashedHabits,
  deleteHabit,
  restoreHabit,
  purgeHabit,
  purgeExpiredHabits,
  logHabit,
  logMeasurableEntry,
  pauseHabit,
  resumeHabit,
} from './habits'
import type { NewHabitInput } from './habits'

const SPACE_ID = 'space-1'

function habitInput(name: string): NewHabitInput {
  return {
    spaceId: SPACE_ID,
    name,
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
  }
}

beforeEach(async () => {
  await db.habits.clear()
  await db.habitLogs.clear()
})

describe('soft-delete (Article 20) — habits', () => {
  it('excludes deleted habits from listActiveHabits and lists them in Trash', async () => {
    const habit = await createHabit(habitInput('Read'))

    expect((await listActiveHabits(SPACE_ID)).map((h) => h.id)).toContain(habit.id)
    expect((await listTrashedHabits(SPACE_ID)).map((h) => h.id)).not.toContain(habit.id)

    await deleteHabit(habit.id)

    expect((await listActiveHabits(SPACE_ID)).map((h) => h.id)).not.toContain(habit.id)
    expect((await listTrashedHabits(SPACE_ID)).map((h) => h.id)).toContain(habit.id)
  })

  it('restores a deleted habit back into the active list', async () => {
    const habit = await createHabit(habitInput('Meditate'))
    await deleteHabit(habit.id)
    await restoreHabit(habit.id)

    expect((await listActiveHabits(SPACE_ID)).map((h) => h.id)).toContain(habit.id)
    expect((await listTrashedHabits(SPACE_ID)).map((h) => h.id)).not.toContain(habit.id)
  })

  it('never returns an archived habit as active, independent of deletedAt', async () => {
    const habit = await createHabit(habitInput('Old habit'))
    await db.habits.update(habit.id, { archivedAt: new Date().toISOString() })

    expect((await listActiveHabits(SPACE_ID)).map((h) => h.id)).not.toContain(habit.id)
  })

  it('purgeHabit hard-deletes the habit and its logs', async () => {
    const habit = await createHabit(habitInput('Stretch'))
    await logHabit(habit.id, '2026-07-01', 'done')
    await deleteHabit(habit.id)

    await purgeHabit(habit.id)

    expect(await db.habits.get(habit.id)).toBeUndefined()
    expect(await db.habitLogs.where('habitId').equals(habit.id).count()).toBe(0)
  })

  it('purgeExpiredHabits only removes trash past the retention window', async () => {
    const stale = await createHabit(habitInput('Stale'))
    const fresh = await createHabit(habitInput('Fresh'))

    const fortyDaysAgo = new Date()
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
    await db.habits.update(stale.id, { deletedAt: fortyDaysAgo.toISOString() })
    await deleteHabit(fresh.id) // deleted "now"

    const purgedCount = await purgeExpiredHabits(30)

    expect(purgedCount).toBe(1)
    expect(await db.habits.get(stale.id)).toBeUndefined()
    expect(await db.habits.get(fresh.id)).toBeDefined()
  })
})

describe('pause/resume (Article 21)', () => {
  it('pauseHabit sets pausedFrom to today and pausedUntil to the given date', async () => {
    const habit = await createHabit(habitInput('Run'))
    await pauseHabit(habit.id, '2099-01-01')

    const reloaded = await db.habits.get(habit.id)
    expect(reloaded?.pausedUntil).toBe('2099-01-01')
    expect(reloaded?.pausedFrom).toBeDefined()
  })

  it('resumeHabit clears both pause fields', async () => {
    const habit = await createHabit(habitInput('Run'))
    await pauseHabit(habit.id, '2099-01-01')
    await resumeHabit(habit.id)

    const reloaded = await db.habits.get(habit.id)
    expect(reloaded?.pausedFrom).toBeUndefined()
    expect(reloaded?.pausedUntil).toBeUndefined()
  })
})

describe('logMeasurableEntry (Article 24 — multiple entries/day, neutral bonus flag)', () => {
  it('a single entry marks the day done, with no bonus', async () => {
    const habit = await createHabit({ ...habitInput('Read'), measurable: { targetValue: 10, unit: 'pages' } })
    await logMeasurableEntry(habit.id, '2026-07-01', 5)

    const log = await db.habitLogs.where('[habitId+date]').equals([habit.id, '2026-07-01']).first()
    expect(log?.status).toBe('done')
    expect(log?.entries).toHaveLength(1)
    expect(log?.entries?.[0].value).toBe(5)
    expect(log?.bonus).toBe(false)
  })

  it('is done from the first entry regardless of whether targetValue is reached', async () => {
    const habit = await createHabit({ ...habitInput('Read'), measurable: { targetValue: 100, unit: 'pages' } })
    await logMeasurableEntry(habit.id, '2026-07-01', 1) // far under target

    const log = await db.habitLogs.where('[habitId+date]').equals([habit.id, '2026-07-01']).first()
    expect(log?.status).toBe('done')
  })

  it('a second entry the same day sets bonus=true and appends rather than overwriting', async () => {
    const habit = await createHabit({ ...habitInput('Drink water'), measurable: { targetValue: 8, unit: 'glasses' } })
    await logMeasurableEntry(habit.id, '2026-07-01', 1)
    await logMeasurableEntry(habit.id, '2026-07-01', 1)

    const log = await db.habitLogs.where('[habitId+date]').equals([habit.id, '2026-07-01']).first()
    expect(log?.entries).toHaveLength(2)
    expect(log?.bonus).toBe(true)
  })

  it('entries on different dates stay independent', async () => {
    const habit = await createHabit({ ...habitInput('Drink water'), measurable: { targetValue: 8, unit: 'glasses' } })
    await logMeasurableEntry(habit.id, '2026-07-01', 1)
    await logMeasurableEntry(habit.id, '2026-07-02', 1)

    const day1 = await db.habitLogs.where('[habitId+date]').equals([habit.id, '2026-07-01']).first()
    const day2 = await db.habitLogs.where('[habitId+date]').equals([habit.id, '2026-07-02']).first()
    expect(day1?.entries).toHaveLength(1)
    expect(day2?.entries).toHaveLength(1)
  })
})
