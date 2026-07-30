import { useLiveQuery } from 'dexie-react-hooks'
import { listSleepLogs } from '../data/sleep'
import type { SleepLog } from '../db/types'

export function useSleepLogs(spaceId: string | null | undefined): SleepLog[] {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      return listSleepLogs(spaceId)
    }, [spaceId]) ?? []
  )
}
