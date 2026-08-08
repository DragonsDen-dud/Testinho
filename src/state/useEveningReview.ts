import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { EveningReview } from '../db/types'

/**
 * The review filed for a given day, or undefined if none.
 *
 * Returns `undefined` both while loading and when genuinely absent — the
 * same shape every other hook here uses. Callers that need to distinguish
 * "still loading" from "nothing there" (the Morning Brief does not: it
 * simply renders nothing in either case) would need an explicit sentinel.
 */
export function useEveningReview(spaceId: string | null | undefined, date: string): EveningReview | undefined {
  return useLiveQuery(async () => {
    if (!spaceId) return undefined
    return db.eveningReviews.where('[spaceId+date]').equals([spaceId, date]).first()
  }, [spaceId, date])
}
