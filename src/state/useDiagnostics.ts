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

/**
 * Drives the unviewed-report badge on the Analytics nav tab. Deliberately
 * scoped to the same "current period" query as useCurrentScheduledReport
 * (week OR month) rather than every scheduled report ever generated — that
 * keeps the badge and the report section on Analytics looking at exactly
 * the same set of reports, so visiting Analytics (which marks whatever it
 * displays as viewed) is guaranteed to clear the badge. A badge driven by a
 * broader "any unviewed report ever" query could get stuck on since Analytics
 * only ever displays/marks-viewed the current period's reports.
 */
export function useHasUnviewedScheduledReport(spaceId: string | null | undefined): boolean {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return false
      const today = todayKey()
      const rows = await db.diagnosticEntries
        .where('spaceId')
        .equals(spaceId)
        .filter(
          (e) =>
            (e.scope === 'week' || e.scope === 'month') &&
            e.reportType === 'scheduled_template' &&
            !!e.aiInsight &&
            !e.viewedAt &&
            e.periodStart <= today &&
            today <= e.periodEnd,
        )
        .count()
      return rows > 0
    }, [spaceId]) ?? false
  )
}

/** Article 48 — every DiagnosticEntry for a Space, for global search.
 * DiagnosticEntry has no deletedAt/Trash concept (unlike Habit/Todo/
 * Project), so there's nothing to exclude here. */
export function useDiagnosticEntries(spaceId: string | null | undefined) {
  return (
    useLiveQuery(async () => {
      if (!spaceId) return []
      return db.diagnosticEntries.where('spaceId').equals(spaceId).toArray()
    }, [spaceId]) ?? []
  )
}
