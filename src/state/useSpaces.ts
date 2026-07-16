import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Space } from '../db/types'

export function useSpaces(): Space[] {
  return (
    useLiveQuery(
      () => db.spaces.filter((s) => !s.archivedAt).sortBy('sortOrder'),
      [],
    ) ?? []
  )
}

export function useActiveSpace(activeSpaceId: string | null | undefined): Space | undefined {
  return useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId],
  )
}
