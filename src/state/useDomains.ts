import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { LifeDomain } from '../db/types'

export function useDomains(spaceId: string | null | undefined): LifeDomain[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      const rows = await db.lifeDomains.where('spaceId').equals(spaceId).sortBy('sortOrder')
      return rows.filter((d) => !d.archivedAt)
    }, [spaceId]) ?? []
  )
}
