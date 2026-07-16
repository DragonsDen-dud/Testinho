import { db } from '../db/db'
import { newId } from '../lib/id'
import type { Habit, HabitLog, HabitLogStatus } from '../db/types'

export type NewHabitInput = Omit<Habit, 'id' | 'createdAt' | 'archivedAt'>

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
