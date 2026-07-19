import { toDateKey } from './date'

/**
 * Article B.2 — the exact offset set a Todo reminder can be set to, stored
 * as a signed minute-offset integer (not a re-derived label string) so
 * display and trigger-time logic always share one source value.
 */
export const REMINDER_OFFSET_MINUTES = {
  atDueTime: 0,
  thirtyMinBefore: 30,
  oneHourBefore: 60,
  oneDayBefore: 1440,
} as const

export type ReminderOffsetKey = keyof typeof REMINDER_OFFSET_MINUTES

export const REMINDER_OFFSET_OPTIONS: { key: ReminderOffsetKey; minutes: number }[] = [
  { key: 'atDueTime', minutes: REMINDER_OFFSET_MINUTES.atDueTime },
  { key: 'thirtyMinBefore', minutes: REMINDER_OFFSET_MINUTES.thirtyMinBefore },
  { key: 'oneHourBefore', minutes: REMINDER_OFFSET_MINUTES.oneHourBefore },
  { key: 'oneDayBefore', minutes: REMINDER_OFFSET_MINUTES.oneDayBefore },
]

/**
 * A Todo's reminder trigger is `(dueDate + scheduledTime) - offsetMinutes`.
 * Pure and deterministic (no dependency on "now") so both the poller
 * (data/reminders.ts) and the UI (ActiveReminderRow's lookup key) compute
 * the exact same instant from the exact same three inputs — never two
 * independent approximations that could drift apart.
 */
export function computeTodoReminderTrigger(dueDate: string, scheduledTime: string, offsetMinutes: number): Date {
  const [y, m, d] = dueDate.split('-').map(Number)
  const [h, min] = scheduledTime.split(':').map(Number)
  const due = new Date(y, m - 1, d, h, min, 0, 0)
  return new Date(due.getTime() - offsetMinutes * 60000)
}

/** The calendar day (YYYY-MM-DD, local) a Todo's reminder actually fires
 * on — this is what keys ReminderState.date, not the Todo's own dueDate,
 * since an offset can push the trigger a day (or more) earlier. */
export function todoReminderTriggerDateKey(dueDate: string, scheduledTime: string, offsetMinutes: number): string {
  return toDateKey(computeTodoReminderTrigger(dueDate, scheduledTime, offsetMinutes))
}
