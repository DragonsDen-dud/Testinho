import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'

/**
 * v10 adds the `quotes` store. It is purely additive — no existing table
 * changes shape, so there is no `.upgrade()` callback to run.
 *
 * What still needs proving, and is the actual risk with an additive store:
 * that opening an existing v9 database at v10 does not disturb the data
 * already in it. A schema string typo (a renamed table, a dropped index)
 * is silent at build time and destroys real user data at runtime.
 *
 * Driven as a genuine v9 → v10 transition, and each test uses its own
 * database name so migrations run from scratch regardless of ordering —
 * the same discipline as migration.v8.test.ts, for the same reason.
 */
function openV9(name: string): Dexie {
  const db = new Dexie(name)
  // Only the tables this test asserts about need declaring; Dexie upgrades
  // a subset happily.
  db.version(9).stores({
    habits: 'id, spaceId, domainId, timeBlockId, archivedAt, deletedAt',
    eveningReviews: 'id, spaceId, date, [spaceId+date]',
  })
  return db
}

function openV10(name: string): Dexie {
  const db = openV9(name)
  db.version(10).stores({
    quotes: 'id, spaceId, deletedAt',
  })
  return db
}

describe('v9 → v10 (quotes store)', () => {
  it('leaves existing rows untouched', async () => {
    const name = `stoa-v10-preserve-${Math.random().toString(36).slice(2)}`
    const v9 = openV9(name)
    await v9.open()
    await v9.table('habits').add({ id: 'h1', spaceId: 's1', name: 'Read', habitType: 'build' })
    await v9.table('eveningReviews').add({ id: 'e1', spaceId: 's1', date: '2026-09-08', mustWins: ['x'] })
    v9.close()

    const v10 = openV10(name)
    await v10.open()
    expect(await v10.table('habits').get('h1')).toMatchObject({ name: 'Read' })
    expect(await v10.table('eveningReviews').get('e1')).toMatchObject({ date: '2026-09-08' })
    v10.close()
  })

  it('creates a usable quotes store, queryable by its indexes', async () => {
    const name = `stoa-v10-store-${Math.random().toString(36).slice(2)}`
    const v9 = openV9(name)
    await v9.open()
    v9.close()

    const v10 = openV10(name)
    await v10.open()
    await v10.table('quotes').bulkAdd([
      { id: 'q1', spaceId: 's1', text: 'one', createdAt: '', updatedAt: '' },
      { id: 'q2', spaceId: 's2', text: 'two', createdAt: '', updatedAt: '' },
      { id: 'q3', spaceId: 's1', text: 'three', createdAt: '', updatedAt: '', deletedAt: '2026-09-08T00:00:00.000Z' },
    ])
    // spaceId is the index every read actually uses (listQuotes).
    expect(await v10.table('quotes').where('spaceId').equals('s1').count()).toBe(2)
    v10.close()
  })

  it('a brand-new database opens straight at v10 with the store present', async () => {
    // The install path, which never runs any upgrade at all.
    const name = `stoa-v10-fresh-${Math.random().toString(36).slice(2)}`
    const db = openV10(name)
    await db.open()
    expect(db.tables.map((t) => t.name)).toContain('quotes')
    expect(await db.table('quotes').count()).toBe(0)
    db.close()
  })
})
