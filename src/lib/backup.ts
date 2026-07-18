import { db } from '../db/db'

export interface BackupFile {
  app: 'stoa'
  schemaVersion: number
  exportedAt: string
  includesPhotos: boolean
  tables: Record<string, unknown[]>
}

/**
 * 20 MB was chosen as the "this export is getting large" warning
 * threshold, not an arbitrary round number: a compressed photo (1280px
 * long edge, JPEG ~0.7 quality — see lib/imageCompression.ts) typically
 * lands around 150–250 KB, and base64-encoding inflates that by roughly
 * 1/3 again. 20 MB of estimated export size corresponds to somewhere
 * around 60–100+ photos, which is comfortably past "a few photos on a few
 * entries" for a habit/journal app and into "this will take a moment to
 * generate, download, or share, and the file is no longer trivially
 * small" — worth telling the user about before they commit to it, not a
 * hard cap that blocks the export.
 */
export const PHOTO_BACKUP_WARNING_BYTES = 20 * 1024 * 1024

const BLOB_MARKER = '__stoa_blob__'

interface EncodedBlob {
  [BLOB_MARKER]: true
  base64: string
  type: string
}

function isEncodedBlob(value: unknown): value is EncodedBlob {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>)[BLOB_MARKER] === true
}

/** Via Blob.arrayBuffer() + btoa rather than FileReader.readAsDataURL —
 * functionally equivalent, but arrayBuffer() is a plain Promise-returning
 * method available in every environment that has Blob at all, whereas
 * FileReader is a separate, callback-based Web API that (unlike Blob
 * itself) Node.js doesn't implement, and jsdom's independent Blob
 * implementation isn't recognized by Node's native structuredClone (which
 * fake-indexeddb uses internally) — using arrayBuffer() sidesteps both
 * gaps and lets this run unmodified in every test/runtime environment this
 * project uses. */
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/**
 * Walks a row's own fields generically — there is no hand-maintained list
 * of "which tables have a photo field," matching buildBackupJson's own
 * table-agnostic design (see the module-level comment on that function for
 * why that matters in this specific project). Any field on any table that
 * happens to hold a Blob is handled the same way, automatically, including
 * ones added after this code was written.
 */
async function encodeRow(row: Record<string, unknown>, includePhotos: boolean): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Blob) {
      if (includePhotos) {
        const encoded: EncodedBlob = { [BLOB_MARKER]: true, base64: await blobToBase64(value), type: value.type }
        result[key] = encoded
      }
      // else: omit the key entirely for a "without photos" export.
    } else {
      result[key] = value
    }
  }
  return result
}

function decodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    result[key] = isEncodedBlob(value) ? base64ToBlob(value.base64, value.type) : value
  }
  return result
}

/**
 * Article 18 — built generically over `db.tables` (Dexie's own live list
 * of every table this database actually has right now) rather than a
 * hand-maintained array of table names. This project's schema has drifted
 * from the original Section D contract repeatedly as features were built
 * (Space.northStar, ReminderState, the AI/quiet-hours/digest AppSettings
 * fields, the home-screen order field, and now the photo Blob fields
 * themselves...) — a hand-maintained export list would silently miss
 * whatever drifts next. Iterating db.tables makes that structurally
 * impossible: any table that exists in the live schema is in the export,
 * automatically, with no list to remember to update. Blob detection
 * (encodeRow above) is equally generic, for the same reason.
 *
 * `includePhotos=false` produces a fast, small export with every photo
 * field simply omitted (not nulled — omitted, so a restore from a
 * without-photos backup leaves those fields unset rather than clearing a
 * photo that existed before the backup, which only matters if this file is
 * ever imported over data newer than itself — an edge case, but the
 * cheaper behavior to get right by construction here).
 */
export async function buildBackupJson(includePhotos: boolean): Promise<{ json: string; filename: string }> {
  const tables: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    const rows = await table.toArray()
    tables[table.name] = await Promise.all(rows.map((row) => encodeRow(row, includePhotos)))
  }
  const backup: BackupFile = {
    app: 'stoa',
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    tables,
  }
  const date = backup.exportedAt.slice(0, 10)
  const suffix = includePhotos ? '-with-photos' : ''
  return { json: JSON.stringify(backup), filename: `stoa-backup-${date}${suffix}.json` }
}

/** For the export UI's size warning — cheap (just sums Blob.size, never
 * reads/encodes the actual bytes) so it can run before the user commits to
 * a "with photos" export. */
export async function estimatePhotoBackupSize(): Promise<{ photoCount: number; estimatedExportBytes: number }> {
  let photoCount = 0
  let rawBytes = 0
  for (const table of db.tables) {
    const rows = await table.toArray()
    for (const row of rows) {
      for (const value of Object.values(row as Record<string, unknown>)) {
        if (value instanceof Blob) {
          photoCount++
          rawBytes += value.size
        }
      }
    }
  }
  // base64 inflates binary size by ~4/3; a little extra for JSON
  // punctuation/keys — round up generously rather than under-warn.
  return { photoCount, estimatedExportBytes: Math.ceil(rawBytes * 1.4) }
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
 * corrupted or foreign file. decodeRow reverses encodeRow's Blob wrapping
 * generically, the same way for every table.
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
        const decoded = rows.map((row) => decodeRow(row as Record<string, unknown>))
        await table.bulkPut(decoded as never[])
      }
    }
  })

  return { ok: true }
}
