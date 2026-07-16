import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveTodos } from '../data/todos'
import type { Todo } from '../db/types'
import { todayKey } from '../lib/date'

/** Raw, possibly-undefined-while-loading result — lets callers that need to
 * know "has this resolved at least once" (e.g. the once-per-day overdue
 * banner) distinguish that from "loaded and genuinely empty". */
function useTodosRaw(spaceId: string | null | undefined): Todo[] | undefined {
  return useLiveQuery(async () => {
    if (!spaceId) return []
    const rows = await listActiveTodos(spaceId)
    return rows.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  }, [spaceId])
}

export function useTodos(spaceId: string | null | undefined): Todo[] {
  return useTodosRaw(spaceId) ?? []
}

export function useOpenTodosToday(
  spaceId: string | null | undefined,
): { today: Todo[]; overdue: Todo[]; loaded: boolean } {
  const raw = useTodosRaw(spaceId)
  const todos = raw ?? []
  const key = todayKey()
  const open = todos.filter((t) => t.status === 'open')
  return {
    today: open.filter((t) => t.dueDate === key),
    overdue: open.filter((t) => t.dueDate && t.dueDate < key),
    loaded: raw !== undefined,
  }
}

export function useOverdueTodos(spaceId: string | null | undefined): Todo[] {
  return useOpenTodosToday(spaceId).overdue
}

export function useSomedayTodos(spaceId: string | null | undefined): Todo[] {
  return useTodos(spaceId).filter((t) => t.status === 'someday')
}
