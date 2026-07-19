import type { PriorityLevel, TimeBlock } from '../db/types'
import { findTimeBlockForTime } from './timeBlockRange'

/** Part 1 — "whichever domain was most recently used for that entity type,
 * not a fixed first-in-list": caller passes only the Habits (or only the
 * Todos) so this stays entity-type-scoped, per the brief. Undefined when
 * nothing in the list has ever had a domain set — no fallback guess. */
export function mostRecentDomainId(items: { domainId?: string; createdAt: string }[]): string | undefined {
  const withDomain = items.filter((i) => i.domainId)
  if (!withDomain.length) return undefined
  return withDomain.reduce((latest, cur) => (cur.createdAt > latest.createdAt ? cur : latest)).domainId
}

/** Part 1 — "the user's mid-tier PriorityLevel, not automatically the
 * highest". priorities is assumed already sorted by sortOrder (as
 * usePriorityLevels returns it). For an even count this picks the lower of
 * the two middle levels — an arbitrary but stable tiebreak, not something
 * worth exposing as a setting. */
export function midTierPriorityLevel(priorities: PriorityLevel[]): PriorityLevel | undefined {
  if (!priorities.length) return undefined
  return priorities[Math.floor((priorities.length - 1) / 2)]
}

export function currentHHMM(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Part 1 — "whichever block corresponds to the current time of day, using
 * each block's approxTimeRange; fall back to the first block if none are
 * timed." Reuses the same matching lib/timeBlockRange.ts already uses for
 * Planning's merged timeline, rather than a second implementation of
 * "which block is this time in". */
export function defaultTimeBlockId(timeBlocks: TimeBlock[], now: Date = new Date()): string | undefined {
  if (!timeBlocks.length) return undefined
  const match = findTimeBlockForTime(currentHHMM(now), timeBlocks)
  return (match ?? timeBlocks[0]).id
}
