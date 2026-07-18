import { db } from '../db/db'

export interface BackupFile {
  app: 'stoa'
  schemaVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

/**
 * Article 18 — built generically over `db.tables` (Dexie's own live list
 * of every table this database actually has right now) rather than a
 * hand-maintained array of table names. This project's schema has drifted
 * from the original Section D contract repeatedly as features were built
 * (Space.northStar, ReminderState, the AI/quiet-hours/digest AppSettings
 * fields, the home-screen order field...) — a hand-maintained export list
 * would silently miss whatever drifts next. Iterating db.tables makes that
 * structurally impossible: any table that exists in the live schema is in
 * the export, automatically, with no list to remember to update.
 *
 * No photo/Blob data exists anywhere in this schema (Article 23 was never
 * built), so there's nothing binary to base64-encode — every table here is
 * already plain JSON-serializable rows.
 */
export async function buildBackupJson(): Promise<{ json: string; filename: string }> {
  const tables: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    tables[table.name] = await table.toArray()
  }
  const backup: BackupFile = {
    app: 'stoa',
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  }
  const date = backup.exportedAt.slice(0, 10)
  return { json: JSON.stringify(backup, null, 2), filename: `stoa-backup-${date}.json` }
}

export type RestoreResult = { ok: true } | { ok: false; reason: 'invalid_format' | 'unknown_table' }

function isBackupFile(value: unknown): value is BackupFile {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as BackupFile).app === 'stoa' &&
    typeof (value as BackupFile).tables === 'object' &&
    (value as BackupFile).tables !== null
  )
}

/**
 * Article 18 — replace-all, not merge: every table is cleared and
 * repopulated from the backup inside a single transaction, so a failure
 * partway through can't leave the database in a mixed old/new state.
 * A table present in the live schema but absent from an older backup file
 * just ends up empty (correct — nothing existed for it at export time),
 * rather than being rejected. A table name in the file that ISN'T part of
 * the live schema is rejected outright, as a basic sanity check against a
 * corrupted or foreign file.
 */
export async function restoreFromBackupJson(json: string): Promise<RestoreResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'invalid_format' }
  }
  if (!isBackupFile(parsed)) return { ok: false, reason: 'invalid_format' }

  const validTableNames = new Set(db.tables.map((t) => t.name))
  for (const name of Object.keys(parsed.tables)) {
    if (!validTableNames.has(name)) return { ok: false, reason: 'unknown_table' }
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
      const rows = parsed.tables[table.name]
      if (rows && rows.length > 0) {
        await table.bulkPut(rows as never[])
      }
    }
  })

  return { ok: true }
}
