import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { findOrphans, clearOrphanReference, deleteOrphanRecord, FK_RELATIONSHIPS } from './integrityCheck'
import type { Habit, Todo, HabitLog, Project, ReminderState } from '../db/types'

const SPACE_ID = 'space-1'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    spaceId: SPACE_ID,
    name: 'Meditate',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function clearAllTables() {
  for (const table of db.tables) await table.clear()
}

beforeEach(async () => {
  await clearAllTables()
  // Every Habit/Todo/etc. fixture below carries a real spaceId — seed the
  // Space once here so tests targeting one specific relationship don't
  // incidentally also trip the (equally real) habits.spaceId/todos.spaceId
  // checks as unrelated noise.
  await db.spaces.put({ id: SPACE_ID, name: 'Personal', icon: '🏠', color: '#fff', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' })
})

describe('FK_RELATIONSHIPS catalog (Article 53)', () => {
  it('covers HabitLog.habitId and Todo.projectId, the two relationships named explicitly in the assignment', () => {
    expect(FK_RELATIONSHIPS).toContainEqual(
      expect.objectContaining({ fromTable: 'habitLogs', field: 'habitId', toTable: 'habits' }),
    )
    expect(FK_RELATIONSHIPS).toContainEqual(
      expect.objectContaining({ fromTable: 'todos', field: 'projectId', toTable: 'projects' }),
    )
  })

  it('does not contain a StakeEvent relationship, because no such table/entity exists in this schema', () => {
    expect(FK_RELATIONSHIPS.some((r) => r.fromTable === 'stakeEvents' || r.fromTable === 'StakeEvent')).toBe(false)
  })
})

describe('findOrphans (Article 53)', () => {
  it('flags a HabitLog whose habitId points at a missing Habit', async () => {
    const log: HabitLog = { id: 'log-1', habitId: 'missing-habit', date: '2026-07-18', status: 'done' }
    await db.habitLogs.put(log)

    const orphans = await findOrphans()
    expect(orphans).toContainEqual({
      fromTable: 'habitLogs',
      recordId: 'log-1',
      field: 'habitId',
      cardinality: 'single',
      danglingIds: ['missing-habit'],
    })
  })

  it('flags a Todo whose projectId points at a missing Project (Article 53 safety-net case, distinct from the Article 20 cascade)', async () => {
    const todo: Todo = {
      id: 'todo-1',
      spaceId: SPACE_ID,
      title: 'Renew passport',
      criticalReminder: false,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      projectId: 'missing-project',
    }
    await db.todos.put(todo)

    const orphans = await findOrphans()
    expect(orphans).toContainEqual(
      expect.objectContaining({ fromTable: 'todos', recordId: 'todo-1', field: 'projectId', danglingIds: ['missing-project'] }),
    )
  })

  it('flags only the dangling id(s) within an array field, not the whole array', async () => {
    await db.habits.put(habit({ id: 'habit-valid' }))
    await db.habits.put(habit({ id: 'habit-with-deps', dependsOnHabitIds: ['habit-valid', 'habit-missing'] }))

    const orphans = await findOrphans()
    const arrayOrphan = orphans.find((o) => o.recordId === 'habit-with-deps')
    expect(arrayOrphan).toEqual({
      fromTable: 'habits',
      recordId: 'habit-with-deps',
      field: 'dependsOnHabitIds',
      cardinality: 'array',
      danglingIds: ['habit-missing'],
    })
  })

  it('flags a polymorphic ReminderState.entityId correctly for both entityType branches', async () => {
    const habitReminder: ReminderState = {
      id: 'rs-habit',
      entityType: 'habit',
      entityId: 'missing-habit',
      date: '2026-07-18',
      state: 'sent',
      sentAt: '2026-07-18T08:00:00.000Z',
      followUpSent: false,
    }
    const todoReminder: ReminderState = {
      id: 'rs-todo',
      entityType: 'todo',
      entityId: 'missing-todo',
      date: '2026-07-18',
      state: 'sent',
      sentAt: '2026-07-18T08:00:00.000Z',
      followUpSent: false,
    }
    await db.reminderStates.put(habitReminder)
    await db.reminderStates.put(todoReminder)

    const orphans = await findOrphans()
    expect(orphans).toContainEqual(
      expect.objectContaining({ fromTable: 'reminderStates', recordId: 'rs-habit', danglingIds: ['missing-habit'] }),
    )
    expect(orphans).toContainEqual(
      expect.objectContaining({ fromTable: 'reminderStates', recordId: 'rs-todo', danglingIds: ['missing-todo'] }),
    )
  })

  it('produces zero false positives against fully valid, well-formed data', async () => {
    await db.spaces.put({ id: SPACE_ID, name: 'Personal', icon: '🏠', color: '#fff', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' })
    await db.habits.put(habit())
    await db.habitLogs.put({ id: 'log-1', habitId: 'habit-1', date: '2026-07-18', status: 'done' })
    const project: Project = { id: 'proj-1', spaceId: SPACE_ID, name: 'Move', createdAt: '2026-01-01T00:00:00.000Z' }
    await db.projects.put(project)
    await db.todos.put({
      id: 'todo-1',
      spaceId: SPACE_ID,
      title: 'Pack boxes',
      criticalReminder: false,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      projectId: 'proj-1',
    })

    expect(await findOrphans()).toEqual([])
  })

  it('does not flag a reference to a soft-deleted (trashed but not purged) record — that is Trash working as designed, not an orphan', async () => {
    await db.habits.put(habit({ deletedAt: '2026-07-01T00:00:00.000Z' })) // trashed, still present
    await db.habitLogs.put({ id: 'log-1', habitId: 'habit-1', date: '2026-06-01', status: 'done' })

    expect(await findOrphans()).toEqual([])
  })

  it('does not flag an unset (undefined) optional reference', async () => {
    await db.todos.put({
      id: 'todo-1',
      spaceId: SPACE_ID,
      title: 'No project',
      criticalReminder: false,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      // projectId intentionally omitted
    })
    expect(await findOrphans()).toEqual([])
  })
})

describe('resolution actions (Article 53)', () => {
  it('clearOrphanReference clears a single-cardinality dangling field', async () => {
    await db.habitLogs.put({ id: 'log-1', habitId: 'missing-habit', date: '2026-07-18', status: 'done' })
    const [orphan] = await findOrphans()

    await clearOrphanReference(orphan)

    const updated = await db.habitLogs.get('log-1')
    expect(updated?.habitId).toBeUndefined()
    expect(await findOrphans()).toEqual([])
  })

  it('clearOrphanReference removes only the dangling id(s) from an array field, keeping valid ones', async () => {
    await db.habits.put(habit({ id: 'habit-valid' }))
    await db.habits.put(habit({ id: 'habit-with-deps', dependsOnHabitIds: ['habit-valid', 'habit-missing'] }))
    const [orphan] = await findOrphans()

    await clearOrphanReference(orphan)

    const updated = await db.habits.get('habit-with-deps')
    expect(updated?.dependsOnHabitIds).toEqual(['habit-valid'])
    expect(await findOrphans()).toEqual([])
  })

  it('deleteOrphanRecord removes the orphaned record entirely', async () => {
    await db.habitLogs.put({ id: 'log-1', habitId: 'missing-habit', date: '2026-07-18', status: 'done' })
    const [orphan] = await findOrphans()

    await deleteOrphanRecord(orphan)

    expect(await db.habitLogs.get('log-1')).toBeUndefined()
    expect(await findOrphans()).toEqual([])
  })
})
