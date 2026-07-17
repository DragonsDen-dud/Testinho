import { weekBoundsOf, weekdayOf, daysBetween } from './date'

const MONTHLY_INTERVAL_DAYS = 30

/**
 * Article 12 — "check-on-open", not a background timer: this only gets
 * evaluated when the app happens to be open, so it can't fire exactly on the
 * configured day. Instead: due once the configured weekday has occurred in
 * the current week (today is that day or later) AND no scheduled report has
 * already been generated for this week. That combination is what makes the
 * "runs on next open after the day, not exactly on the day" caveat true —
 * whenever the app is next opened on or after the configured day, it catches
 * up, rather than silently missing the week if that exact day was never open.
 */
export function isWeeklyScheduledReportDue(
  enabled: boolean | undefined,
  dayOfWeek: number | undefined,
  hasApiKey: boolean,
  apiReachable: boolean,
  lastScheduledPeriodEnd: string | undefined,
  today: string,
): boolean {
  if (enabled === false) return false
  if (!hasApiKey || !apiReachable) return false

  const configuredDay = dayOfWeek ?? 1 // Monday
  const { end: weekEnd } = weekBoundsOf(today)
  const todayDow = weekdayOf(today)
  const daysSinceMonday = (todayDow - 1 + 7) % 7
  const configuredOffset = (configuredDay - 1 + 7) % 7
  if (configuredOffset > daysSinceMonday) return false // configured day hasn't happened yet this week

  if (lastScheduledPeriodEnd && lastScheduledPeriodEnd >= weekEnd) return false // already generated this week (or later)
  return true
}

/**
 * Article 12 — month scope. Unlike week scope there's no day-of-month
 * setting to wait for — due purely once ~30 days have elapsed since the
 * last month-scope scheduled report (or immediately if none exists yet).
 * Independently schedulable from the weekly cadence: this function knows
 * nothing about week-scope state, and vice versa, so neither can starve or
 * clobber the other when both are checked on the same app-open.
 */
export function isMonthlyScheduledReportDue(
  enabled: boolean | undefined,
  hasApiKey: boolean,
  apiReachable: boolean,
  lastScheduledPeriodEnd: string | undefined,
  today: string,
): boolean {
  if (enabled === false) return false
  if (!hasApiKey || !apiReachable) return false
  if (!lastScheduledPeriodEnd) return true
  return daysBetween(lastScheduledPeriodEnd, today) >= MONTHLY_INTERVAL_DAYS
}
