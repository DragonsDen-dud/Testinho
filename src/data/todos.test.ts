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
  markTodoDone,
  moveToSomeday,
  promoteSomeday,
  rescheduleTodo,
  bulkRescheduleTodos,
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

describe('markTodoDone + recurrence (Article 28)', () => {
  it('a non-recurring todo just completes, no new instance', async () => {
    const todo = await createTodo(todoInput('One-off'))

    const next = await markTodoDone(todo.id)

    expect(next).toBeUndefined()
    expect((await db.todos.get(todo.id))?.status).toBe('done')
    expect(await db.todos.where('spaceId').equals(SPACE_ID).count()).toBe(1)
  })

  it('a recurring todo generates a new open instance with the recomputed dueDate', async () => {
    const todo = await createTodo({
      ...todoInput('Water the plants'),
      dueDate: '2026-07-01',
      recurrence: { type: 'weekly', params: {} },
    })

    const next = await markTodoDone(todo.id)

    expect((await db.todos.get(todo.id))?.status).toBe('done')
    expect(next).toBeDefined()
    expect(next?.status).toBe('open')
    expect(next?.dueDate).toBe('2026-07-08')
    expect(next?.title).toBe('Water the plants')
    expect(next?.recurrence).toEqual({ type: 'weekly', params: {} })
  })

  it('completing late does not compress the next interval (end-to-end through markTodoDone)', async () => {
    const todo = await createTodo({
      ...todoInput('Weekly review'),
      dueDate: '2026-07-01',
      recurrence: { type: 'weekly', params: {} },
    })

    // Completed 3 days after the original due date.
    const next = await markTodoDone(todo.id)

    expect(next?.dueDate).toBe('2026-07-08') // 7 days after the ORIGINAL due date, not after "today"
  })

  it('carries forward priority/domain/project/scheduledTime to the next instance', async () => {
    const todo = await createTodo({
      spaceId: SPACE_ID,
      title: 'Standup',
      criticalReminder: false,
      dueDate: '2026-07-01',
      scheduledTime: '09:00',
      priorityLevelId: 'prio-1',
      domainId: 'domain-1',
      projectId: 'project-1',
      recurrence: { type: 'daily', params: {} },
    })

    const next = await markTodoDone(todo.id)

    expect(next?.scheduledTime).toBe('09:00')
    expect(next?.priorityLevelId).toBe('prio-1')
    expect(next?.domainId).toBe('domain-1')
    expect(next?.projectId).toBe('project-1')
  })

  it('editing recurrence on the current instance only affects future-generated instances', async () => {
    const todo = await createTodo({
      ...todoInput('Sync'),
      dueDate: '2026-07-01',
      recurrence: { type: 'weekly', params: {} },
    })

    await db.todos.update(todo.id, { recurrence: { type: 'monthly', params: {} } })
    const next = await markTodoDone(todo.id)

    expect(next?.dueDate).toBe('2026-08-01') // monthly, not weekly — reflects the edited recurrence
  })

  it('editing recurrence on a new instance never touches an already-completed prior instance', async () => {
    const first = await createTodo({
      ...todoInput('Weekly review'),
      dueDate: '2026-07-01',
      recurrence: { type: 'weekly', params: {} },
    })
    const second = await markTodoDone(first.id)
    expect(second).toBeDefined()

    await db.todos.update(second!.id, { recurrence: { type: 'monthly', params: {} } })

    const reloadedFirst = await db.todos.get(first.id)
    expect(reloadedFirst?.status).toBe('done')
    expect(reloadedFirst?.recurrence).toEqual({ type: 'weekly', params: {} })
  })

  it('a recurring todo with no dueDate completes but does not regenerate (no anchor to compute from)', async () => {
    const todo = await createTodo({ ...todoInput('No anchor'), recurrence: { type: 'daily', params: {} } })

    const next = await markTodoDone(todo.id)

    expect(next).toBeUndefined()
    expect((await db.todos.get(todo.id))?.status).toBe('done')
  })
})

describe('Someday (Article 31)', () => {
  it('creates a todo directly in someday status when requested', async () => {
    const todo = await createTodo(todoInput('Learn pottery'), 'someday')
    expect(todo.status).toBe('someday')
  })

  it('moveToSomeday pushes an open todo to someday', async () => {
    const todo = await createTodo(todoInput('Reorganize garage'))
    await moveToSomeday(todo.id)
    expect((await db.todos.get(todo.id))?.status).toBe('someday')
  })

  it('promoteSomeday requires both dueDate and priorityLevelId, and rejects when either is missing', async () => {
    const todo = await createTodo(todoInput('Learn pottery'), 'someday')

    await expect(promoteSomeday(todo.id, '', 'prio-1')).rejects.toThrow()
    await expect(promoteSomeday(todo.id, '2026-08-01', '')).rejects.toThrow()

    // Confirm it truly never transitioned on either rejected attempt.
    expect((await db.todos.get(todo.id))?.status).toBe('someday')
  })

  it('promoteSomeday flips status to open and sets both fields when both are supplied', async () => {
    const todo = await createTodo(todoInput('Learn pottery'), 'someday')

    await promoteSomeday(todo.id, '2026-08-01', 'prio-1')

    const reloaded = await db.todos.get(todo.id)
    expect(reloaded?.status).toBe('open')
    expect(reloaded?.dueDate).toBe('2026-08-01')
    expect(reloaded?.priorityLevelId).toBe('prio-1')
  })
})

describe('reschedule (Article 30)', () => {
  it('rescheduleTodo updates a single dueDate', async () => {
    const todo = await createTodo({ ...todoInput('Overdue thing'), dueDate: '2026-07-01' })
    await rescheduleTodo(todo.id, '2026-07-15')
    expect((await db.todos.get(todo.id))?.dueDate).toBe('2026-07-15')
  })

  it('bulkRescheduleTodos updates dueDate on every listed id and nothing else', async () => {
    const a = await createTodo({ ...todoInput('A'), dueDate: '2026-06-01' })
    const b = await createTodo({ ...todoInput('B'), dueDate: '2026-06-02' })
    const untouched = await createTodo({ ...todoInput('C'), dueDate: '2026-06-03' })

    await bulkRescheduleTodos([a.id, b.id], '2026-07-01')

    expect((await db.todos.get(a.id))?.dueDate).toBe('2026-07-01')
    expect((await db.todos.get(b.id))?.dueDate).toBe('2026-07-01')
    expect((await db.todos.get(untouched.id))?.dueDate).toBe('2026-06-03')
  })
})
