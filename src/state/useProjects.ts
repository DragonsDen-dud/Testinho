import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { listActiveProjects } from '../data/projects'
import type { Project, Todo } from '../db/types'

export function useProjects(spaceId: string | null | undefined): Project[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      const rows = await listActiveProjects(spaceId)
      // Same defensive posture as useHabits.ts (black-screen incident) —
      // don't trust real/legacy IndexedDB data to actually match the type.
      return rows.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    }, [spaceId]) ?? []
  )
}

/**
 * Looks up a single Project by id regardless of trashed state — a
 * soft-deleted Project still resolves here (only purge removes the row),
 * so callers can tell "trashed, restorable" apart from "gone for good"
 * and render accordingly (e.g. a Todo's "Project deleted" badge).
 */
export function useProject(projectId: string | null | undefined): Project | undefined {
  return useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
}

/** % of a project's active (non-archived, non-trashed) todos that are done. */
export function projectProgress(todos: Todo[], projectId: string): { done: number; total: number; percent: number } {
  const linked = todos.filter((t) => t.projectId === projectId && t.status !== 'archived')
  const done = linked.filter((t) => t.status === 'done').length
  const total = linked.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
