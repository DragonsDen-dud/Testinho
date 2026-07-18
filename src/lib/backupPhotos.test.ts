import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { buildBackupJson, restoreFromBackupJson, estimatePhotoBackupSize, PHOTO_BACKUP_WARNING_BYTES } from './backup'
import type { Habit, Todo, JournalEntry, HabitLog } from '../db/types'

/**
 * Article 23 — a separate file from backup.test.ts purely for
 * organization. Runs under the same default 'node' Vitest environment as
 * the rest of the backup tests.
 *
 * Note for the record: this originally ran under `@vitest-environment
 * jsdom`, because base64-encoding a Blob (blobToBase64 in backup.ts)
 * originally used FileReader, which plain Node doesn't implement. That
 * surfaced a real, separate problem: under jsdom, fake-indexeddb's
 * internal cloning (which calls the ambient `structuredClone`) silently
 * corrupts a Blob into `{}` on storage — confirmed directly, not assumed
 * (jsdom's own Blob implementation isn't recognized by the environment's
 * native structuredClone, which fake-indexeddb relies on for its
 * IndexedDB-spec-mandated clone-on-insert step). That's a test-double
 * limitation, not a real-browser one — real IndexedDB natively clones
 * Blobs correctly. blobToBase64 was rewritten to use Blob.arrayBuffer()
 * instead of FileReader, which sidesteps the whole issue: it needs nothing
 * jsdom-specific, so this file runs under plain Node, where
 * structuredClone(Blob) genuinely works (verified directly), and the
 * jsdom/fake-indexeddb interaction bug never comes into play.
 */

function makeFakePhotoBlob(byte: number, size = 64): Blob {
  return new Blob([new Uint8Array(size).fill(byte)], { type: 'image/jpeg' })
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

describe('with-photos export/import round-trips real Blob content (Article 23)', () => {
  it('a HabitLog, Todo, and JournalEntry each carrying a photo survive the cycle with the restored Blob byte-identical', async () => {
    const habitPhoto = makeFakePhotoBlob(0x11)
    const todoPhoto = makeFakePhotoBlob(0x22)
    const journalPhoto = makeFakePhotoBlob(0x33)

    const habit: Habit = {
      id: 'habit-1',
      spaceId: 'space-1',
      name: 'Meditate',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const habitLog: HabitLog = { id: 'log-1', habitId: 'habit-1', date: '2026-07-18', status: 'done', photo: habitPhoto }
    const todo: Todo = {
      id: 'todo-1',
      spaceId: 'space-1',
      title: 'Fix the fence',
      criticalReminder: false,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      photo: todoPhoto,
    }
    const journalEntry: JournalEntry = {
      id: 'entry-1',
      spaceId: 'space-1',
      date: '2026-07-18',
      text: 'Good day.',
      createdAt: '2026-07-18T00:00:00.000Z',
      photo: journalPhoto,
    }

    await db.habits.put(habit)
    await db.habitLogs.put(habitLog)
    await db.todos.put(todo)
    await db.journalEntries.put(journalEntry)

    const { json } = await buildBackupJson(true)

    // Confirm the export is actually carrying real base64 photo data, not
    // silently dropping it the way a without-photos export would.
    expect(json).toContain('__stoa_blob__')

    for (const table of db.tables) await table.clear()

    const result = await restoreFromBackupJson(json)
    expect(result.ok).toBe(true)

    const restoredLog = await db.habitLogs.get('log-1')
    const restoredTodo = await db.todos.get('todo-1')
    const restoredEntry = await db.journalEntries.get('entry-1')

    expect(restoredLog?.photo).toBeInstanceOf(Blob)
    expect(restoredTodo?.photo).toBeInstanceOf(Blob)
    expect(restoredEntry?.photo).toBeInstanceOf(Blob)

    // Byte-for-byte, not just "a Blob exists" or "the size matches" —
    // the actual restored pixel data must be identical to what was saved.
    expect(await blobBytes(restoredLog!.photo!)).toEqual(await blobBytes(habitPhoto))
    expect(await blobBytes(restoredTodo!.photo!)).toEqual(await blobBytes(todoPhoto))
    expect(await blobBytes(restoredEntry!.photo!)).toEqual(await blobBytes(journalPhoto))

    expect(restoredLog?.photo?.type).toBe('image/jpeg')
  })

  it('a without-photos export omits the photo field entirely, leaving it unset after restore', async () => {
    const habit: Habit = {
      id: 'habit-1',
      spaceId: 'space-1',
      name: 'Meditate',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const habitLog: HabitLog = { id: 'log-1', habitId: 'habit-1', date: '2026-07-18', status: 'done', photo: makeFakePhotoBlob(0x44) }
    await db.habits.put(habit)
    await db.habitLogs.put(habitLog)

    const { json } = await buildBackupJson(false)
    expect(json).not.toContain('__stoa_blob__')

    for (const table of db.tables) await table.clear()
    const result = await restoreFromBackupJson(json)
    expect(result.ok).toBe(true)

    const restoredLog = await db.habitLogs.get('log-1')
    expect(restoredLog).toBeTruthy()
    expect(restoredLog?.photo).toBeUndefined()
  })
})

describe('estimatePhotoBackupSize (Article 23)', () => {
  it('counts photos and estimates export size across every table generically', async () => {
    await db.habits.put({
      id: 'habit-1',
      spaceId: 'space-1',
      name: 'Meditate',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.habitLogs.put({ id: 'log-1', habitId: 'habit-1', date: '2026-07-18', status: 'done', photo: makeFakePhotoBlob(0x11, 1000) })
    await db.todos.put({
      id: 'todo-1',
      spaceId: 'space-1',
      title: 'Fix fence',
      criticalReminder: false,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      photo: makeFakePhotoBlob(0x22, 2000),
    })

    const estimate = await estimatePhotoBackupSize()
    expect(estimate.photoCount).toBe(2)
    // 3000 raw bytes * 1.4 (base64 + JSON overhead) = 4200
    expect(estimate.estimatedExportBytes).toBe(4200)
  })

  it('returns zero when there are no photos anywhere', async () => {
    const estimate = await estimatePhotoBackupSize()
    expect(estimate).toEqual({ photoCount: 0, estimatedExportBytes: 0 })
  })
})

describe('PHOTO_BACKUP_WARNING_BYTES (Article 23)', () => {
  it('is documented as 20 MB', () => {
    expect(PHOTO_BACKUP_WARNING_BYTES).toBe(20 * 1024 * 1024)
  })
})
