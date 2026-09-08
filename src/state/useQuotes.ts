import { useLiveQuery } from 'dexie-react-hooks'
import { listQuotes } from '../data/quotes'
import type { Quote } from '../db/types'

export function useQuotes(spaceId: string | null | undefined): Quote[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      return listQuotes(spaceId)
    }, [spaceId]) ?? []
  )
}
