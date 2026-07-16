import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { TimeBlock, PriorityLevel } from '../db/types'

export function useTimeBlocks(spaceId: string | null | undefined): TimeBlock[] {
  return (
    useLiveQuery(() => {
      if (!spaceId) return []
      return db.timeBlocks.where('spaceId').equals(spaceId).sortBy('sortOrder')
    }, [spaceId]) ?? []
  )
}

export function usePriorityLevels(spaceId: string | null | undefined): PriorityLevel[] {
  return (
    useLiveQuery(() => {
      if (!spaceId) return []
      return db.priorityLevels.where('spaceId').equals(spaceId).sortBy('sortOrder')
    }, [spaceId]) ?? []
  )
}
