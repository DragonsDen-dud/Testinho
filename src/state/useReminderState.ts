import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { ReminderEntityType, ReminderState } from '../db/types'

/** Article 40 — the actionable reminder state for one entity+day, if any.
 * Only 'sent' or 'snoozed' are actionable — everything else (acknowledged,
 * dismissed, lapsed_for_day) has nothing left to show a Snooze/Not now for. */
export function useActiveReminderState(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
): ReminderState | undefined {
  return useLiveQuery(async () => {
    const state = await db.reminderStates
      .where('[entityType+entityId+date]')
      .equals([entityType, entityId, date])
      .first()
    return state && (state.state === 'sent' || state.state === 'snoozed') ? state : undefined
  }, [entityType, entityId, date])
}
