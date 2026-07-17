import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import { todayKey } from '../lib/date'
import { acknowledgeReminder } from './reminderActions'
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

/** Article 21 — pause from today until `until` (inclusive). Strength freezes, no check-in, no reminders. */
export async function pauseHabit(id: string, until: string): Promise<void> {
  await db.habits.update(id, { pausedFrom: todayKey(), pausedUntil: until })
}

export async function resumeHabit(id: string): Promise<void> {
  await db.habits.update(id, { pausedFrom: undefined, pausedUntil: undefined })
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

/** For non-measurable habits: sets the day's status directly (done/not_done/skip). */
export async function logHabit(
  habitId: string,
  date: string,
  status: HabitLogStatus,
  extra?: { note?: string; mood?: number },
): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  const record: HabitLog = {
    id: existing?.id ?? newId(),
    habitId,
    date,
    status,
    note: extra?.note ?? existing?.note,
    mood: extra?.mood ?? existing?.mood,
  }
  await db.habitLogs.put(record)
  // Article 40 — any check-in (even not_done/skip) means the user engaged
  // with the reminder; nudging further about it would be pointless.
  await acknowledgeReminder('habit', habitId, date)
}

/**
 * For measurable habits (Article 24): appends one entry rather than
 * overwriting a single value, so a habit can be logged more than once a
 * day. `bonus` is a neutral fact (entries.length >= 2) — never rendered as
 * a score or reward (Article 6, Article 24 explicit callout).
 */
export async function logMeasurableEntry(
  habitId: string,
  date: string,
  value: number,
  extra?: { note?: string; mood?: number },
): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  const entries = [...(existing?.entries ?? []), { timestamp: new Date().toISOString(), value }]
  const record: HabitLog = {
    id: existing?.id ?? newId(),
    habitId,
    date,
    status: 'done',
    entries,
    bonus: entries.length >= 2,
    note: extra?.note ?? existing?.note,
    mood: extra?.mood ?? existing?.mood,
  }
  await db.habitLogs.put(record)
  await acknowledgeReminder('habit', habitId, date)
}

/**
 * Attaches (or clears, when `mood` is undefined) a mood value to an
 * already-saved check-in. Deliberately separate from logHabit/
 * logMeasurableEntry — the status is saved the instant Done/Not done/Skip
 * is tapped, and mood is a purely additive follow-up tap that never blocks
 * or re-triggers that save. No-ops if there's no log for the day yet.
 */
export async function setHabitLogMood(habitId: string, date: string, mood: number | undefined): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  if (!existing) return
  await db.habitLogs.update(existing.id, { mood })
}

export async function clearHabitLog(habitId: string, date: string): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  if (existing) await db.habitLogs.delete(existing.id)
}
