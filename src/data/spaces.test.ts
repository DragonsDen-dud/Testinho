import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createSpace } from './spaces'

beforeEach(async () => {
  await db.spaces.clear()
  await db.timeBlocks.clear()
  await db.priorityLevels.clear()
  await db.journalPrompts.clear()
})

describe('createSpace default seeding', () => {
  it('seeds 5 editable journal prompts, all active, in the requested language', async () => {
    const space = await createSpace({ name: 'Personal', color: '#000', icon: '🏠' }, 'en')

    const prompts = await db.journalPrompts.where('spaceId').equals(space.id).toArray()

    expect(prompts).toHaveLength(5)
    expect(prompts.every((p) => p.active)).toBe(true)
    expect(prompts.map((p) => p.text)).toContain('What went well today?')
  })

  it('seeds Russian prompts when language is ru', async () => {
    const space = await createSpace({ name: 'Личное', color: '#000', icon: '🏠' }, 'ru')

    const prompts = await db.journalPrompts.where('spaceId').equals(space.id).toArray()

    expect(prompts.map((p) => p.text)).toContain('Что сегодня получилось хорошо?')
  })

  it('also seeds default time blocks and priority levels (unrelated regression guard)', async () => {
    const space = await createSpace({ name: 'Work', color: '#000', icon: '💼' }, 'en')

    expect(await db.timeBlocks.where('spaceId').equals(space.id).count()).toBe(3)
    expect(await db.priorityLevels.where('spaceId').equals(space.id).count()).toBe(3)
  })
})
