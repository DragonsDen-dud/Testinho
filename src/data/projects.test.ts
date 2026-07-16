import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  createProject,
  listActiveProjects,
  listTrashedProjects,
  deleteProject,
  restoreProject,
  purgeProject,
  purgeExpiredProjects,
} from './projects'
import { createTodo } from './todos'
import { projectProgress } from '../state/useProjects'

const SPACE_ID = 'space-1'

beforeEach(async () => {
  await db.projects.clear()
  await db.todos.clear()
})

describe('soft-delete (Article 20) — projects', () => {
  it('excludes deleted projects from listActiveProjects and lists them in Trash', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Move apartments' })

    expect((await listActiveProjects(SPACE_ID)).map((p) => p.id)).toContain(project.id)

    await deleteProject(project.id)

    expect((await listActiveProjects(SPACE_ID)).map((p) => p.id)).not.toContain(project.id)
    expect((await listTrashedProjects(SPACE_ID)).map((p) => p.id)).toContain(project.id)
  })

  it('restores a deleted project back into the active list', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Launch website' })
    await deleteProject(project.id)
    await restoreProject(project.id)

    expect((await listActiveProjects(SPACE_ID)).map((p) => p.id)).toContain(project.id)
  })

  it('never returns an archived project as active, independent of deletedAt', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Old project' })
    await db.projects.update(project.id, { archivedAt: new Date().toISOString() })

    expect((await listActiveProjects(SPACE_ID)).map((p) => p.id)).not.toContain(project.id)
  })

  it('purgeProject hard-deletes the record', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Temp' })
    await deleteProject(project.id)

    await purgeProject(project.id)

    expect(await db.projects.get(project.id)).toBeUndefined()
  })

  it('purgeExpiredProjects only removes trash past the retention window', async () => {
    const stale = await createProject({ spaceId: SPACE_ID, name: 'Stale' })
    const fresh = await createProject({ spaceId: SPACE_ID, name: 'Fresh' })

    const fortyDaysAgo = new Date()
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
    await db.projects.update(stale.id, { deletedAt: fortyDaysAgo.toISOString() })
    await deleteProject(fresh.id)

    const purgedCount = await purgeExpiredProjects(30)

    expect(purgedCount).toBe(1)
    expect(await db.projects.get(stale.id)).toBeUndefined()
    expect(await db.projects.get(fresh.id)).toBeDefined()
  })
})

describe('Todo.projectId across Project deletion (two-stage: Trash vs. purge)', () => {
  it('(a) soft-delete leaves Todo.projectId untouched, and the Project row still resolves as deleted — the precondition TodoItem checks to render "Project deleted"', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Kitchen remodel' })
    const todo = await createTodo({ spaceId: SPACE_ID, title: 'Pick tiles', projectId: project.id, criticalReminder: false })

    await deleteProject(project.id)

    const reloadedTodo = await db.todos.get(todo.id)
    const reloadedProject = await db.projects.get(project.id)
    expect(reloadedTodo?.projectId).toBe(project.id)
    expect(reloadedProject).toBeDefined()
    expect(reloadedProject?.deletedAt).toBeDefined()
  })

  it('(b) restoring the Project clears deletedAt while Todo.projectId never moved — the badge reverts to normal with zero data loss', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Kitchen remodel' })
    const todo = await createTodo({ spaceId: SPACE_ID, title: 'Pick tiles', projectId: project.id, criticalReminder: false })

    await deleteProject(project.id)
    expect((await db.todos.get(todo.id))?.projectId).toBe(project.id)

    await restoreProject(project.id)

    const reloadedTodo = await db.todos.get(todo.id)
    const reloadedProject = await db.projects.get(project.id)
    expect(reloadedTodo?.projectId).toBe(project.id)
    expect(reloadedProject?.deletedAt).toBeUndefined()
  })

  it('(c) purging the Project clears projectId on every Todo that referenced it', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Kitchen remodel' })
    const t1 = await createTodo({ spaceId: SPACE_ID, title: 'Pick tiles', projectId: project.id, criticalReminder: false })
    const t2 = await createTodo({ spaceId: SPACE_ID, title: 'Order cabinets', projectId: project.id, criticalReminder: false })
    const unrelated = await createTodo({ spaceId: SPACE_ID, title: 'Unrelated', criticalReminder: false })

    await deleteProject(project.id)
    await purgeProject(project.id)

    expect((await db.todos.get(t1.id))?.projectId).toBeUndefined()
    expect((await db.todos.get(t2.id))?.projectId).toBeUndefined()
    expect((await db.todos.get(unrelated.id))?.projectId).toBeUndefined()
  })

  it('(d) a Todo whose Project was purged never holds a dangling projectId — there is nothing left to resolve, so no dangling reference can render', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Temp project' })
    const todo = await createTodo({ spaceId: SPACE_ID, title: 'Some task', projectId: project.id, criticalReminder: false })

    await deleteProject(project.id)
    await purgeProject(project.id)

    expect(await db.projects.get(project.id)).toBeUndefined()
    const reloadedTodo = await db.todos.get(todo.id)
    expect(reloadedTodo?.projectId).toBeUndefined()
    // and by construction: looking up an undefined projectId never queries the table at all
    expect(reloadedTodo?.projectId ? await db.projects.get(reloadedTodo.projectId) : undefined).toBeUndefined()
  })

  it('purgeExpiredProjects also cascades the projectId cleanup via purgeProject', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Old project' })
    const todo = await createTodo({ spaceId: SPACE_ID, title: 'Orphan-to-be', projectId: project.id, criticalReminder: false })
    const fortyDaysAgo = new Date()
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
    await db.projects.update(project.id, { deletedAt: fortyDaysAgo.toISOString() })

    await purgeExpiredProjects(30)

    expect(await db.projects.get(project.id)).toBeUndefined()
    expect((await db.todos.get(todo.id))?.projectId).toBeUndefined()
  })
})

describe('projectProgress', () => {
  it('counts done vs. total among active (non-archived) linked todos', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Kitchen remodel' })
    const t1 = await createTodo({ spaceId: SPACE_ID, title: 'Pick tiles', projectId: project.id, criticalReminder: false })
    await createTodo({ spaceId: SPACE_ID, title: 'Order cabinets', projectId: project.id, criticalReminder: false })
    await createTodo({ spaceId: SPACE_ID, title: 'Unrelated', criticalReminder: false })
    await db.todos.update(t1.id, { status: 'done' })

    const todos = await db.todos.toArray()
    const progress = projectProgress(todos, project.id)

    expect(progress.total).toBe(2)
    expect(progress.done).toBe(1)
    expect(progress.percent).toBe(50)
  })

  it('excludes archived todos from the denominator', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Trip planning' })
    const t1 = await createTodo({ spaceId: SPACE_ID, title: 'Book flights', projectId: project.id, criticalReminder: false })
    const t2 = await createTodo({ spaceId: SPACE_ID, title: 'Cancelled idea', projectId: project.id, criticalReminder: false })
    await db.todos.update(t1.id, { status: 'done' })
    await db.todos.update(t2.id, { status: 'archived' })

    const todos = await db.todos.toArray()
    const progress = projectProgress(todos, project.id)

    expect(progress.total).toBe(1)
    expect(progress.done).toBe(1)
    expect(progress.percent).toBe(100)
  })

  it('reports 0% for a project with no linked todos', async () => {
    const project = await createProject({ spaceId: SPACE_ID, name: 'Empty project' })
    const progress = projectProgress([], project.id)
    expect(progress).toEqual({ done: 0, total: 0, percent: 0 })
  })
})
