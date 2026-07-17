import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayKey } from '../lib/date'
import type { DiagnosticEntry } from '../db/types'

/** Article 12 — the current period's Scheduled AI Report for the given
 * scope, if one has been generated yet, so Dashboard can surface it without
 * a button press. Week and month are independent — this never mixes them. */
export function useCurrentScheduledReport(
  spaceId: string | null | undefined,
  scope: 'week' | 'month',
): DiagnosticEntry | undefined {
  return useLiveQuery(async () => {
    if (!spaceId) return undefined
    const today = todayKey()
    const rows = await db.diagnosticEntries
      .where('spaceId')
      .equals(spaceId)
      .filter(
        (e) =>
          e.scope === scope &&
          e.reportType === 'scheduled_template' &&
          !!e.aiInsight &&
          e.periodStart <= today &&
          today <= e.periodEnd,
      )
      .toArray()
    return rows[0]
  }, [spaceId, scope])
}
