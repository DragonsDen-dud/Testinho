import type { AppSettings } from '../db/types'
import { daysBetween } from './date'

type AiUsage = NonNullable<AppSettings['aiUsage']>

const PERIOD_DAYS = 30

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
