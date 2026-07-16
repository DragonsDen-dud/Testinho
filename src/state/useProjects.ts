import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveProjects } from '../data/projects'
import type { Project, Todo } from '../db/types'

export function useProjects(spaceId: string | null | undefined): Project[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      const rows = await listActiveProjects(spaceId)
      return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }, [spaceId]) ?? []
  )
}

/** % of a project's active (non-archived, non-trashed) todos that are done. */
export function projectProgress(todos: Todo[], projectId: string): { done: number; total: number; percent: number } {
  const linked = todos.filter((t) => t.projectId === projectId && t.status !== 'archived')
  const done = linked.filter((t) => t.status === 'done').length
  const total = linked.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
