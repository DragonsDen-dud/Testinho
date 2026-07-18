import { beforeEach, describe, expect, it } from 'vitest'
import { db, ensureAppSettings } from '../db/db'
import { updateAppSettings } from './useAppSettings'

/**
 * Article 45 — the reorder UI itself just calls updateAppSettings with the
 * new array (see HomeScreenOrderSection); this locks in that the write
 * round-trips exactly as written (order preserved, not re-sorted or
 * deduped) so Dashboard's `order.map(key => sections[key])` renders in the
 * order the user actually set.
 */
describe('homeScreenModuleOrder persistence (Article 45)', () => {
  beforeEach(async () => {
    await db.appSettings.clear()
    await ensureAppSettings()
  })

  it('persists a reordered array exactly as written', async () => {
    await updateAppSettings({ homeScreenModuleOrder: ['todos', 'habits'] })
    const settings = await db.appSettings.get('singleton')
    expect(settings?.homeScreenModuleOrder).toEqual(['todos', 'habits'])
  })

  it('defaults to habits-then-todos before any reorder happens', async () => {
    const settings = await db.appSettings.get('singleton')
    expect(settings?.homeScreenModuleOrder).toEqual(['habits', 'todos'])
  })
})
