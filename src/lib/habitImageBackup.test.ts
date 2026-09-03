import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { buildBackupJson, restoreFromBackupJson, estimatePhotoBackupSize } from './backup'
import type { Habit } from '../db/types'

/**
 * `Habit.image` is a fourth Blob field in a codebase that already had
 * three, and backup.ts handles photos generically — it walks `db.tables`
 * and encodes any Blob it finds, precisely so a new photo field cannot be
 * forgotten (see its own note about schema drift).
 *
 * That is a claim worth testing rather than trusting. If the generic path
 * ever regressed into a hand-maintained list, a habit photo would vanish
 * on restore and the user would only find out after wiping their device.
 *
 * Same 'node' environment and Blob discipline as backupPhotos.test.ts —
 * see that file's header for why this does not run under jsdom.
 */

function fakeImage(byte: number, size = 96): Blob {
  return new Blob([new Uint8Array(size).fill(byte)], { type: 'image/jpeg' })
}

function habit(overrides: Partial<Habit>): Habit {
  return {
    id: 'h1',
    spaceId: 's1',
    name: 'Push Ups',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Habit
}

beforeEach(async () => {
  for (const table of db.tables) await table.clear()
})

describe('Habit.image survives backup and restore (Article 23)', () => {
  it('round-trips byte-identically in a with-photos export', async () => {
    const image = fakeImage(0x5a)
    await db.habits.put(habit({ image, emoji: '🏋️' }))

    const { json } = await buildBackupJson(true)
    for (const table of db.tables) await table.clear()
    await restoreFromBackupJson(json)

    const restored = await db.habits.get('h1')
    expect(restored?.image).toBeInstanceOf(Blob)
    expect(new Uint8Array(await restored!.image!.arrayBuffer())).toEqual(new Uint8Array(await image.arrayBuffer()))
    // The emoji is a plain string and rides along on the same row; asserted
    // so a future encoder change can't quietly drop the cheaper tier while
    // the expensive one keeps working.
    expect(restored?.emoji).toBe('🏋️')
  })

  it('is omitted, not nulled, by a without-photos export', async () => {
    await db.habits.put(habit({ image: fakeImage(0x01), emoji: '🏃' }))

    const { json } = await buildBackupJson(false)
    expect(json).not.toContain('__stoa_blob__')

    for (const table of db.tables) await table.clear()
    await restoreFromBackupJson(json)

    const restored = await db.habits.get('h1')
    expect(restored?.image).toBeUndefined()
    // The emoji must still survive a photo-less backup — it is not a photo.
    expect(restored?.emoji).toBe('🏃')
  })

  it('is counted by the pre-export size estimate', async () => {
    // Otherwise the Article 23 size warning would understate a library of
    // habit photos and let the user build an export they can't open.
    const before = await estimatePhotoBackupSize()
    await db.habits.put(habit({ image: fakeImage(0x02, 4096) }))
    const after = await estimatePhotoBackupSize()

    expect(after.photoCount).toBe(before.photoCount + 1)
    expect(after.estimatedExportBytes).toBeGreaterThan(before.estimatedExportBytes)
  })
})
