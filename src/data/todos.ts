import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import { computeNextDueDate } from '../lib/todoRecurrence'
import { acknowledgeReminder } from './reminderActions'
import type { Todo, TodoStatus } from '../db/types'

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

export async function createTodo(data: NewTodoInput, initialStatus: TodoStatus = 'open'): Promise<Todo> {
  const todo: Todo = { ...data, id: newId(), status: initialStatus, createdAt: new Date().toISOString() }
  await db.todos.add(todo)
  return todo
}

export async function updateTodo(id: string, patch: Partial<Todo>): Promise<void> {
  await db.todos.update(id, patch)
}

/**
 * Marks the todo done. If it's recurring (Article 28), also creates the next
 * instance — computed from this instance's own dueDate, never "today", so a
 * late completion doesn't compress the next interval. Returns the new
 * instance when one was generated, otherwise undefined.
 */
export async function markTodoDone(id: string): Promise<Todo | undefined> {
  const current = await db.todos.get(id)
  await db.todos.update(id, { status: 'done', completedAt: new Date().toISOString() })
  // Article 40 — completing the todo is what stops escalation; no separate
  // "acknowledge" tap needed. A todo with no dueDate never had a reminder to
  // acknowledge, so this is a safe no-op in that case.
  if (current?.dueDate) await acknowledgeReminder('todo', id, current.dueDate)
  if (!current?.recurrence || !current.dueDate) return undefined

  const next: Todo = {
    id: newId(),
    spaceId: current.spaceId,
    title: current.title,
    description: current.description,
    dueDate: computeNextDueDate(current.dueDate, current.recurrence),
    scheduledTime: current.scheduledTime,
    priorityLevelId: current.priorityLevelId,
    domainId: current.domainId,
    projectId: current.projectId,
    criticalReminder: current.criticalReminder,
    recurrence: current.recurrence,
    status: 'open',
    createdAt: new Date().toISOString(),
  }
  await db.todos.add(next)
  return next
}

export async function reopenTodo(id: string): Promise<void> {
  await db.todos.update(id, { status: 'open', completedAt: undefined })
}

export async function archiveTodo(id: string): Promise<void> {
  await db.todos.update(id, { status: 'archived' })
}

/** Article 31 — pushes an existing todo to the Someday list. */
export async function moveToSomeday(id: string): Promise<void> {
  await db.todos.update(id, { status: 'someday' })
}

/**
 * Article 31 — "Start doing this": a someday item can only become 'open'
 * once both dueDate and priorityLevelId are supplied. Throws if either is
 * missing, rather than silently promoting a task with no plan behind it.
 */
export async function promoteSomeday(id: string, dueDate: string, priorityLevelId: string): Promise<void> {
  if (!dueDate || !priorityLevelId) {
    throw new Error('promoteSomeday requires both dueDate and priorityLevelId')
  }
  await db.todos.update(id, { status: 'open', dueDate, priorityLevelId })
}

/** Article 30 — reschedule a single todo (used by the Tomorrow/In a week/Pick a date menu). */
export async function rescheduleTodo(id: string, newDueDate: string): Promise<void> {
  await db.todos.update(id, { dueDate: newDueDate })
}

/** Article 30 — bulk reschedule for the overdue triage screen's "all to X" actions. */
export async function bulkRescheduleTodos(ids: string[], newDueDate: string): Promise<void> {
  await db.todos.where('id').anyOf(ids).modify({ dueDate: newDueDate })
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
