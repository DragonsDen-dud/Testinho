import { isTimeWithinRange } from './timeBlockRange'
import { toDateKey, addDays } from './date'

export type QuietHoursDecision = 'fire' | 'queue' | 'drop'

/**
 * Article 41 — any notification that would fire inside quiet hours is
 * queued and delivered right at the end, never dropped outright, unless the
 * originally-scheduled day is already over (then it's silently skipped
 * rather than showing up stale). "Queue" doesn't move anything — the caller
 * just re-checks on its next tick, and once `now` has crossed past
 * `quietHours.end`, this naturally returns 'fire' on its own.
 *
 * Staleness is judged by calendar day, not a fixed hour count: a
 * non-wrapping quiet window is only ever valid on `scheduledDate` itself; a
 * wrapping window (e.g. 22:00-07:00) is valid through `scheduledDate` and
 * the one following day it legitimately spills into — anything beyond that
 * is "tomorrow" relative to even the delayed delivery, and gets dropped.
 */
export function resolveQuietHoursDelivery(
  quietHours: { enabled: boolean; start: string; end: string } | undefined,
  scheduledDate: string, // YYYY-MM-DD the notification was originally due
  now: Date,
): QuietHoursDecision {
  if (!quietHours?.enabled) return 'fire'

  const nowDate = toDateKey(now)
  const wraps = quietHours.start > quietHours.end
  const validThroughDate = wraps ? addDays(scheduledDate, 1) : scheduledDate

  if (nowDate < scheduledDate || nowDate > validThroughDate) return 'drop'

  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const inQuietWindow = isTimeWithinRange(nowTime, { start: quietHours.start, end: quietHours.end })
  return inQuietWindow ? 'queue' : 'fire'
}
