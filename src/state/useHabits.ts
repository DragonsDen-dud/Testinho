import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { listActiveHabits } from '../data/habits'
import type { Habit, HabitLog } from '../db/types'

/**
 * Same query as useHabits, but keeps the "hasn't resolved yet" signal that
 * useHabits deliberately swallows.
 *
 * The distinction matters for anything that renders differently when empty:
 * `[]` from a live query that hasn't run yet and `[]` from a user with no
 * habits look identical, which is how Today ended up flashing an empty
 * layout and then jumping when the real data landed a few frames later.
 */
export function useHabitsQuery(spaceId: string | null | undefined): { habits: Habit[]; loaded: boolean } {
  const rows = useLiveQuery(async () => {
    if (!spaceId) return []
    const list = await listActiveHabits(spaceId)
    // Same defensive posture as safeCreatedDate (habitStrength.ts) — a
    // malformed/missing createdAt on real data must not crash the sort
    // that runs on every Habits-tab render (black-screen incident).
    return list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  }, [spaceId])
  return { habits: rows ?? [], loaded: rows !== undefined }
}

export function useHabits(spaceId: string | null | undefined): Habit[] {
  return useHabitsQuery(spaceId).habits
}

export function useHabitLogs(habitId: string | undefined): HabitLog[] {
  return (
    useLiveQuery(() => {
      if (!habitId) return []
      return db.habitLogs.where('habitId').equals(habitId).toArray()
    }, [habitId]) ?? []
  )
}

/** All logs for a set of habit ids on one date, keyed by habitId. */
export function useLogsForDate(habitIds: string[], date: string): Map<string, HabitLog> {
  const logs =
    useLiveQuery(async () => {
      if (habitIds.length === 0) return []
      const all = await db.habitLogs.where('date').equals(date).toArray()
      return all.filter((l) => habitIds.includes(l.habitId))
    }, [habitIds.join(','), date]) ?? []
  return new Map(logs.map((l) => [l.habitId, l]))
}

/**
 * Full log history for a set of habits (E.6 Analytics), keyed by habitId.
 * Queries per-habit via the indexed `habitId` field (Article 17 — aggregate
 * at query level, not a full-table scan), same shape as useHabitLogs above.
 */
export function useHabitLogsForHabits(habitIds: string[]): Map<string, HabitLog[]> {
  const key = habitIds.slice().sort().join(',')
  return (
    useLiveQuery(async () => {
      if (habitIds.length === 0) return new Map<string, HabitLog[]>()
      const entries = await Promise.all(
        habitIds.map(async (id) => [id, await db.habitLogs.where('habitId').equals(id).toArray()] as const),
      )
      return new Map(entries)
    }, [key]) ?? new Map<string, HabitLog[]>()
  )
}
