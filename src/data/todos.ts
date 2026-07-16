import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import type { Todo } from '../db/types'

export type NewTodoInput = Omit<Todo, 'id' | 'createdAt' | 'status' | 'completedAt' | 'deletedAt'>

/** The only place that should query Todos for a Space — see lib/trash.ts. */
export async function listActiveTodos(spaceId: string): Promise<Todo[]> {
  const rows = await db.todos.where('spaceId').equals(spaceId).toArray()
  return excludeTrashed(rows)
}

export async function listTrashedTodos(spaceId: string): Promise<Todo[]> {
  const rows = await db.todos.where('spaceId').equals(spaceId).toArray()
  return onlyTrashed(rows)
}

export async function createTodo(data: NewTodoInput): Promise<Todo> {
  const todo: Todo = { ...data, id: newId(), status: 'open', createdAt: new Date().toISOString() }
  await db.todos.add(todo)
  return todo
}

export async function updateTodo(id: string, patch: Partial<Todo>): Promise<void> {
  await db.todos.update(id, patch)
}

export async function markTodoDone(id: string): Promise<void> {
  await db.todos.update(id, { status: 'done', completedAt: new Date().toISOString() })
}

export async function reopenTodo(id: string): Promise<void> {
  await db.todos.update(id, { status: 'open', completedAt: undefined })
}

export async function archiveTodo(id: string): Promise<void> {
  await db.todos.update(id, { status: 'archived' })
}

export async function toggleSubtask(todo: Todo, subtaskId: string): Promise<void> {
  const subtasks = (todo.subtasks ?? []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
  await db.todos.update(todo.id, { subtasks })
}

/** Soft-delete (Article 20) — moves the task to Trash, recoverable until purge. */
export async function deleteTodo(id: string): Promise<void> {
  await db.todos.update(id, { deletedAt: new Date().toISOString() })
}

export async function restoreTodo(id: string): Promise<void> {
  await db.todos.update(id, { deletedAt: undefined })
}

/** Hard delete — irreversible. Only call from Trash's "delete forever". */
export async function purgeTodo(id: string): Promise<void> {
  await db.todos.delete(id)
}

export async function purgeExpiredTodos(retentionDays: number, asOf = new Date()): Promise<number> {
  const expired = await db.todos
    .filter((t) => !!t.deletedAt && isExpired(t.deletedAt, retentionDays, asOf))
    .toArray()
  for (const t of expired) await purgeTodo(t.id)
  return expired.length
}
