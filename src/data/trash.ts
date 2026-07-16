import { db } from '../db/db'
import { purgeExpiredHabits } from './habits'
import { purgeExpiredTodos } from './todos'

/** Article 20 — auto-purge trash past AppSettings.trashRetentionDays. Run once per app start. */
export async function purgeExpiredTrash(): Promise<void> {
  const settings = await db.appSettings.get('singleton')
  const retentionDays = settings?.trashRetentionDays ?? 30
  await purgeExpiredHabits(retentionDays)
  await purgeExpiredTodos(retentionDays)
}
