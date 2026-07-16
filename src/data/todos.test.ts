import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  createTodo,
  listActiveTodos,
  listTrashedTodos,
  deleteTodo,
  restoreTodo,
  purgeTodo,
  purgeExpiredTodos,
} from './todos'
import type { NewTodoInput } from './todos'

const SPACE_ID = 'space-1'

function todoInput(title: string): NewTodoInput {
  return { spaceId: SPACE_ID, title, criticalReminder: false }
}

beforeEach(async () => {
  await db.todos.clear()
})

describe('soft-delete (Article 20) — todos', () => {
  it('excludes deleted todos from listActiveTodos and lists them in Trash', async () => {
    const todo = await createTodo(todoInput('Buy groceries'))

    expect((await listActiveTodos(SPACE_ID)).map((t) => t.id)).toContain(todo.id)

    await deleteTodo(todo.id)

    expect((await listActiveTodos(SPACE_ID)).map((t) => t.id)).not.toContain(todo.id)
    expect((await listTrashedTodos(SPACE_ID)).map((t) => t.id)).toContain(todo.id)
  })

  it('restores a deleted todo back into the active list', async () => {
    const todo = await createTodo(todoInput('Renew passport'))
    await deleteTodo(todo.id)
    await restoreTodo(todo.id)

    expect((await listActiveTodos(SPACE_ID)).map((t) => t.id)).toContain(todo.id)
    expect((await listTrashedTodos(SPACE_ID)).map((t) => t.id)).not.toContain(todo.id)
  })

  it('purgeTodo hard-deletes the record', async () => {
    const todo = await createTodo(todoInput('Call dentist'))
    await deleteTodo(todo.id)

    await purgeTodo(todo.id)

    expect(await db.todos.get(todo.id)).toBeUndefined()
  })

  it('purgeExpiredTodos only removes trash past the retention window', async () => {
    const stale = await createTodo(todoInput('Stale'))
    const fresh = await createTodo(todoInput('Fresh'))

    const fortyDaysAgo = new Date()
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
    await db.todos.update(stale.id, { deletedAt: fortyDaysAgo.toISOString() })
    await deleteTodo(fresh.id)

    const purgedCount = await purgeExpiredTodos(30)

    expect(purgedCount).toBe(1)
    expect(await db.todos.get(stale.id)).toBeUndefined()
    expect(await db.todos.get(fresh.id)).toBeDefined()
  })
})
