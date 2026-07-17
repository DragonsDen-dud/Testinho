import type { TimeBlock, TimeBlockRange } from '../db/types'

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** True if `hhmm` falls in [start, end); wraps past midnight when end <= start. */
export function isTimeWithinRange(hhmm: string, range: TimeBlockRange): boolean {
  const t = toMinutes(hhmm)
  const start = toMinutes(range.start)
  const end = toMinutes(range.end)
  if (start === end) return true // a 24h range
  if (start < end) return t >= start && t < end
  return t >= start || t < end // wraps midnight
}

/** Finds which of the given TimeBlocks' ranges contains `hhmm`, if any. */
export function findTimeBlockForTime(hhmm: string, timeBlocks: TimeBlock[]): TimeBlock | undefined {
  return timeBlocks.find((tb) => tb.approxTimeRange && isTimeWithinRange(hhmm, tb.approxTimeRange))
}

/** Sort key for a TimeBlock by its range start (minutes since midnight), for merged-timeline ordering. */
export function timeBlockStartMinutes(timeBlock: TimeBlock): number {
  return timeBlock.approxTimeRange ? toMinutes(timeBlock.approxTimeRange.start) : Number.MAX_SAFE_INTEGER
}
