import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { PlanEntry } from '../db/types'

export function usePlanEntry(
  spaceId: string | null | undefined,
  date: string,
  scope: PlanEntry['scope'],
): PlanEntry | undefined {
  return useLiveQuery(() => {
    if (!spaceId) return undefined
    return db.planEntries.where('[spaceId+date+scope]').equals([spaceId, date, scope]).first()
  }, [spaceId, date, scope])
}
