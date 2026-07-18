import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createHabit } from './habits'
import { createTodo } from './todos'
import { purgeExpiredTrash } from './trash'

const SPACE_ID = 'space-1'

beforeEach(async () => {
  await db.habits.clear()
  await db.habitLogs.clear()
  await db.todos.clear()
  await db.appSettings.clear()
})

describe('purgeExpiredTrash (Article 20 auto-purge)', () => {
  it('honors AppSettings.trashRetentionDays for both habits and todos', async () => {
    await db.appSettings.put({
      id: 'singleton',
      language: 'en',
      theme: { preset: 'system' },
      activeSpaceId: SPACE_ID,
      homeScreenModuleOrder: ['habits', 'todos'],
      onboardingComplete: true,
      crossSpaceOverviewEnabled: false,
      trashRetentionDays: 7,
    })

    const habit = await createHabit({
      spaceId: SPACE_ID,
      name: 'Old habit',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
    })
    const todo = await createTodo({ spaceId: SPACE_ID, title: 'Old todo', criticalReminder: false })

    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    await db.habits.update(habit.id, { deletedAt: tenDaysAgo.toISOString() })
    await db.todos.update(todo.id, { deletedAt: tenDaysAgo.toISOString() })

    await purgeExpiredTrash()

    expect(await db.habits.get(habit.id)).toBeUndefined()
    expect(await db.todos.get(todo.id)).toBeUndefined()
  })

  it('falls back to a 30-day default when no settings row exists', async () => {
    const habit = await createHabit({
      spaceId: SPACE_ID,
      name: 'Undated settings habit',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
    })
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    await db.habits.update(habit.id, { deletedAt: tenDaysAgo.toISOString() })

    await purgeExpiredTrash()

    // 10 days < 30-day default, so it should survive.
    expect(await db.habits.get(habit.id)).toBeDefined()
  })
})
