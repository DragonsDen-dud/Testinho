import { describe, expect, it } from 'vitest'
import { isBackupReminderDue } from './backupReminder'

const TODAY = '2026-07-18'

describe('isBackupReminderDue (Article 18)', () => {
  it('is due immediately when never backed up and never snoozed', () => {
    expect(isBackupReminderDue({}, TODAY)).toBe(true)
  })

  it('is not due right after a backup, before the interval elapses', () => {
    expect(isBackupReminderDue({ lastBackupExportedAt: '2026-07-10', backupReminderIntervalDays: 30 }, TODAY)).toBe(false)
  })

  it('becomes due once the interval has fully elapsed since the last export', () => {
    // 2026-06-18 -> 2026-07-18 is exactly 30 days.
    expect(isBackupReminderDue({ lastBackupExportedAt: '2026-06-18', backupReminderIntervalDays: 30 }, TODAY)).toBe(true)
  })

  it('is not yet due one day short of the interval', () => {
    expect(isBackupReminderDue({ lastBackupExportedAt: '2026-06-19', backupReminderIntervalDays: 30 }, TODAY)).toBe(false)
  })

  it('defaults to a 30-day interval when none is set', () => {
    expect(isBackupReminderDue({ lastBackupExportedAt: '2026-06-18' }, TODAY)).toBe(true)
    expect(isBackupReminderDue({ lastBackupExportedAt: '2026-06-19' }, TODAY)).toBe(false)
  })

  it('a snooze suppresses the reminder until (and including) its date', () => {
    expect(isBackupReminderDue({ backupReminderSnoozedUntil: '2026-07-25' }, TODAY)).toBe(false)
  })

  it('the reminder resumes once the snoozed-until date has passed', () => {
    expect(isBackupReminderDue({ backupReminderSnoozedUntil: '2026-07-17' }, TODAY)).toBe(true)
  })

  it('a snooze suppresses even a genuinely overdue backup, until it expires', () => {
    expect(
      isBackupReminderDue(
        { lastBackupExportedAt: '2026-01-01', backupReminderIntervalDays: 30, backupReminderSnoozedUntil: '2026-08-01' },
        TODAY,
      ),
    ).toBe(false)
  })
})
