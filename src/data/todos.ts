import { db } from '../db/db'
import { newId } from '../lib/id'
import type { Todo } from '../db/types'

export type NewTodoInput = Omit<Todo, 'id' | 'createdAt' | 'status' | 'completedAt'>

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
