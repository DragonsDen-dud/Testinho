import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createHabit, deleteHabit, restoreHabit } from './habits'
import { createTodo, deleteTodo, restoreTodo } from './todos'
import { createProject, deleteProject, restoreProject } from './projects'
import type { NewHabitInput } from './habits'
import type { NewTodoInput } from './todos'
import type { NewProjectInput } from './projects'

const SPACE_ID = 'space-1'

/**
 * Article 50 — the undo toast's onUndo callback is literally restoreHabit/
 * restoreTodo/restoreProject, the same functions Trash's "Restore" button
 * calls (src/pages/TrashPage.tsx). This locks in that a delete->restore
 * round-trip via those functions reconstructs every field exactly as it
 * was, not just that the record exists again — "identical to a manual
 * Trash restore" is trivially true here since it's literally the same
 * function, but the fields-intact guarantee is worth pinning down.
 */

beforeEach(async () => {
  await db.habits.clear()
  await db.todos.clear()
  await db.projects.clear()
})

describe('undo toast restore parity — Habit', () => {
  it('reconstructs every field exactly, with only deletedAt cleared', async () => {
    const input: NewHabitInput = {
      spaceId: SPACE_ID,
      name: 'Meditate',
      habitType: 'build',
      schedule: { type: 'specific_weekdays', params: { weekdays: [1, 3, 5] } },
      reminderTimes: ['08:00'],
      criticalReminder: true,
      // STOA-5: the top-level `note` field this input used to carry was
      // removed (dead — written here and by the form, never read by any
      // screen). Restoring a habit is unaffected; the per-check-in
      // HabitLog.note, which the detail view actually displays, is a
      // different field on a different table and is untouched.
    }
    const created = await createHabit(input)
    await deleteHabit(created.id)

    const trashed = await db.habits.get(created.id)
    expect(trashed?.deletedAt).toBeTruthy()

    await restoreHabit(created.id)
    const restored = await db.habits.get(created.id)

    expect(restored?.deletedAt).toBeUndefined()
    expect({ ...restored, deletedAt: undefined }).toEqual({ ...created, deletedAt: undefined })
  })
})

describe('undo toast restore parity — Todo', () => {
  it('reconstructs every field exactly, with only deletedAt cleared', async () => {
    const input: NewTodoInput = {
      spaceId: SPACE_ID,
      title: 'Renew passport',
      description: 'bring old passport + photos',
      dueDate: '2026-08-01',
      criticalReminder: false,
    }
    const created = await createTodo(input)
    await deleteTodo(created.id)

    const trashed = await db.todos.get(created.id)
    expect(trashed?.deletedAt).toBeTruthy()

    await restoreTodo(created.id)
    const restored = await db.todos.get(created.id)

    expect(restored?.deletedAt).toBeUndefined()
    expect({ ...restored, deletedAt: undefined }).toEqual({ ...created, deletedAt: undefined })
  })
})

describe('undo toast restore parity — Project', () => {
  it('reconstructs every field exactly, with only deletedAt cleared', async () => {
    const input: NewProjectInput = {
      spaceId: SPACE_ID,
      name: 'Move apartments',
      color: '#4477ff',
    }
    const created = await createProject(input)
    await deleteProject(created.id)

    const trashed = await db.projects.get(created.id)
    expect(trashed?.deletedAt).toBeTruthy()

    await restoreProject(created.id)
    const restored = await db.projects.get(created.id)

    expect(restored?.deletedAt).toBeUndefined()
    expect({ ...restored, deletedAt: undefined }).toEqual({ ...created, deletedAt: undefined })
  })
})
