import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import type { Habit, HabitLog, HabitLogStatus } from '../db/types'

export type NewHabitInput = Omit<Habit, 'id' | 'createdAt' | 'archivedAt' | 'deletedAt'>

/** The only place that should query Habits for a Space — see lib/trash.ts. */
export async function listActiveHabits(spaceId: string): Promise<Habit[]> {
  const rows = await db.habits.where('spaceId').equals(spaceId).toArray()
  return excludeTrashed(rows.filter((h) => !h.archivedAt))
}

export async function listTrashedHabits(spaceId: string): Promise<Habit[]> {
  const rows = await db.habits.where('spaceId').equals(spaceId).toArray()
  return onlyTrashed(rows)
}

export async function createHabit(data: NewHabitInput): Promise<Habit> {
  const habit: Habit = { ...data, id: newId(), createdAt: new Date().toISOString() }
  await db.habits.add(habit)
  return habit
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  await db.habits.update(id, patch)
}

export async function archiveHabit(id: string): Promise<void> {
  await db.habits.update(id, { archivedAt: new Date().toISOString() })
}

export async function unarchiveHabit(id: string): Promise<void> {
  await db.habits.update(id, { archivedAt: undefined })
}

/** Soft-delete (Article 20) — moves the habit to Trash, recoverable until purge. */
export async function deleteHabit(id: string): Promise<void> {
  await db.habits.update(id, { deletedAt: new Date().toISOString() })
}

export async function restoreHabit(id: string): Promise<void> {
  await db.habits.update(id, { deletedAt: undefined })
}

/** Hard delete — irreversible. Only call from Trash's "delete forever". */
export async function purgeHabit(id: string): Promise<void> {
  await db.habits.delete(id)
  await db.habitLogs.where('habitId').equals(id).delete()
}

export async function purgeExpiredHabits(retentionDays: number, asOf = new Date()): Promise<number> {
  const expired = await db.habits
    .filter((h) => !!h.deletedAt && isExpired(h.deletedAt, retentionDays, asOf))
    .toArray()
  for (const h of expired) await purgeHabit(h.id)
  return expired.length
}

export async function logHabit(
  habitId: string,
  date: string,
  status: HabitLogStatus,
  extra?: { value?: number; note?: string; mood?: number },
): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  const record: HabitLog = {
    id: existing?.id ?? newId(),
    habitId,
    date,
    status,
    value: extra?.value ?? existing?.value,
    note: extra?.note ?? existing?.note,
    mood: extra?.mood ?? existing?.mood,
  }
  await db.habitLogs.put(record)
}

export async function clearHabitLog(habitId: string, date: string): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  if (existing) await db.habitLogs.delete(existing.id)
}
