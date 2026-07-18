import { daysBetween } from './date'

const DEFAULT_INTERVAL_DAYS = 30

/**
 * Article 18 — never having backed up is due immediately (not after some
 * grace period), same as the rest of this app's banners surface a true
 * condition right away rather than delaying it. "Remind me later" snoozes
 * until a specific date rather than just re-adding the interval to "now",
 * so repeatedly snoozing on different days doesn't silently drift the
 * schedule.
 */
export function isBackupReminderDue(
  settings: {
    lastBackupExportedAt?: string
    backupReminderSnoozedUntil?: string
    backupReminderIntervalDays?: number
  },
  today: string,
): boolean {
  if (settings.backupReminderSnoozedUntil && settings.backupReminderSnoozedUntil > today) return false
  if (!settings.lastBackupExportedAt) return true
  const intervalDays = settings.backupReminderIntervalDays ?? DEFAULT_INTERVAL_DAYS
  return daysBetween(settings.lastBackupExportedAt, today) >= intervalDays
}
