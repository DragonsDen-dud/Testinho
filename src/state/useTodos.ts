import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveTodos } from '../data/todos'
import type { Todo } from '../db/types'
import { todayKey } from '../lib/date'

export function useTodos(spaceId: string | null | undefined): Todo[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      const rows = await listActiveTodos(spaceId)
      return rows.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    }, [spaceId]) ?? []
  )
}

export function useOpenTodosToday(spaceId: string | null | undefined): { today: Todo[]; overdue: Todo[] } {
  const todos = useTodos(spaceId)
  const key = todayKey()
  const open = todos.filter((t) => t.status === 'open')
  return {
    today: open.filter((t) => t.dueDate === key),
    overdue: open.filter((t) => t.dueDate && t.dueDate < key),
  }
}
