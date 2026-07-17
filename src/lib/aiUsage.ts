import type { AppSettings } from '../db/types'

type AiUsage = NonNullable<AppSettings['aiUsage']>

const MS_PER_DAY = 86400000
const PERIOD_DAYS = 30

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY)
}

/**
 * Article 38 — a rolling 30-day usage period, not a calendar month, so
 * there's no edge case around short months. Starting a new period resets
 * callCount to 1 (the call that triggered this) rather than 0, since this is
 * only ever invoked right after a successful call.
 */
export function nextUsageState(usage: AiUsage | undefined, now: string): AiUsage {
  if (!usage) return { callCount: 1, currentPeriodStart: now }
  if (daysBetween(usage.currentPeriodStart, now) >= PERIOD_DAYS) {
    return { callCount: 1, currentPeriodStart: now, softCapWarningThreshold: usage.softCapWarningThreshold }
  }
  return { ...usage, callCount: usage.callCount + 1 }
}
