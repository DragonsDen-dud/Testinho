import { db } from '../db/db'
import { newId } from '../lib/id'
import { computeSleepTimestamps } from '../lib/sleep'
import type { SleepLog } from '../db/types'

export async function listSleepLogs(spaceId: string): Promise<SleepLog[]> {
  const rows = await db.sleepLogs.where('spaceId').equals(spaceId).toArray()
  return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/**
 * One entry per spaceId+date (same upsert-by-composite-key shape logHabit
 * already uses for HabitLog's [habitId+date]) — logging again for an
 * already-logged date updates that row's bedTime/wakeTime rather than
 * creating a duplicate.
 */
export async function upsertSleepLog(
  spaceId: string,
  date: string,
  bedTimeHHMM: string,
  wakeTimeHHMM: string,
): Promise<SleepLog> {
  const existing = await db.sleepLogs.where('[spaceId+date]').equals([spaceId, date]).first()
  const { bedTime, wakeTime } = computeSleepTimestamps(date, bedTimeHHMM, wakeTimeHHMM)
  const record: SleepLog = { id: existing?.id ?? newId(), spaceId, date, bedTime, wakeTime }
  await db.sleepLogs.put(record)
  return record
}
