import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import type { Project } from '../db/types'

export type NewProjectInput = Omit<Project, 'id' | 'createdAt' | 'archivedAt' | 'deletedAt'>

/** The only place that should query Projects for a Space — see lib/trash.ts. */
export async function listActiveProjects(spaceId: string): Promise<Project[]> {
  const rows = await db.projects.where('spaceId').equals(spaceId).toArray()
  return excludeTrashed(rows.filter((p) => !p.archivedAt))
}

export async function listTrashedProjects(spaceId: string): Promise<Project[]> {
  const rows = await db.projects.where('spaceId').equals(spaceId).toArray()
  return onlyTrashed(rows)
}

export async function createProject(data: NewProjectInput): Promise<Project> {
  const project: Project = { ...data, id: newId(), createdAt: new Date().toISOString() }
  await db.projects.add(project)
  return project
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  await db.projects.update(id, patch)
}

export async function archiveProject(id: string): Promise<void> {
  await db.projects.update(id, { archivedAt: new Date().toISOString() })
}

/** Soft-delete (Article 20) — moves the project to Trash, recoverable until purge. */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.update(id, { deletedAt: new Date().toISOString() })
}

export async function restoreProject(id: string): Promise<void> {
  await db.projects.update(id, { deletedAt: undefined })
}

/**
 * Hard delete — irreversible. Only call from Trash's "delete forever" or the
 * retention sweep. This is the point of no return for the Project, so it's
 * also the point of no return for the reference: every Todo that pointed at
 * it gets demoted to project-less. While merely soft-deleted (in Trash),
 * linked Todos keep their projectId untouched — see deleteProject above.
 */
export async function purgeProject(id: string): Promise<void> {
  await db.todos.where('projectId').equals(id).modify((todo) => {
    delete todo.projectId
  })
  await db.projects.delete(id)
}

export async function purgeExpiredProjects(retentionDays: number, asOf = new Date()): Promise<number> {
  const expired = await db.projects
    .filter((p) => !!p.deletedAt && isExpired(p.deletedAt, retentionDays, asOf))
    .toArray()
  for (const p of expired) await purgeProject(p.id)
  return expired.length
}
