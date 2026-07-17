import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayKey } from '../lib/date'
import type { DiagnosticEntry } from '../db/types'

/** Article 12 — the current week's Scheduled AI Report, if one has been
 * generated yet, so Dashboard can surface it without a button press. */
export function useCurrentWeekScheduledReport(spaceId: string | null | undefined): DiagnosticEntry | undefined {
  return useLiveQuery(async () => {
    if (!spaceId) return undefined
    const today = todayKey()
    const rows = await db.diagnosticEntries
      .where('spaceId')
      .equals(spaceId)
      .filter(
        (e) =>
          e.scope === 'week' &&
          e.reportType === 'scheduled_template' &&
          !!e.aiInsight &&
          e.periodStart <= today &&
          today <= e.periodEnd,
      )
      .toArray()
    return rows[0]
  }, [spaceId])
}
