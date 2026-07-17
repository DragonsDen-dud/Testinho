import { describe, expect, it } from 'vitest'
import { isWeeklyScheduledReportDue, isMonthlyScheduledReportDue } from './scheduledReport'

// 2026-07-13 is a Monday, so this week runs 2026-07-13 (Mon) .. 2026-07-19 (Sun).
const WEDNESDAY = '2026-07-15'
const THURSDAY = '2026-07-16'
const SUNDAY = '2026-07-19'
const PREVIOUS_WEEK_END = '2026-07-12'
const THIS_WEEK_END = '2026-07-19'

describe('isWeeklyScheduledReportDue (Article 12)', () => {
  it('is never due when week.enabled is explicitly false', () => {
    expect(isWeeklyScheduledReportDue(false, 1, true, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due without an API key', () => {
    expect(isWeeklyScheduledReportDue(true, 1, false, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due when the connectivity check reports unreachable', () => {
    expect(isWeeklyScheduledReportDue(true, 1, true, false, undefined, THURSDAY)).toBe(false)
  })

  it('is not due when the configured weekday has not happened yet this week', () => {
    // Friday (5) configured, but today is only Wednesday.
    expect(isWeeklyScheduledReportDue(true, 5, true, true, undefined, WEDNESDAY)).toBe(false)
  })

  it('is due once the configured weekday has occurred this week and nothing generated yet', () => {
    // Monday (1, the default) has already passed by Thursday.
    expect(isWeeklyScheduledReportDue(true, 1, true, true, undefined, THURSDAY)).toBe(true)
  })

  it('defaults to Monday when dayOfWeek is undefined', () => {
    expect(isWeeklyScheduledReportDue(true, undefined, true, true, undefined, THURSDAY)).toBe(true)
  })

  it('is not due if a scheduled report was already generated for this week', () => {
    expect(isWeeklyScheduledReportDue(true, 1, true, true, THIS_WEEK_END, THURSDAY)).toBe(false)
  })

  it('is due again once a new week has started, even if last week was generated', () => {
    expect(isWeeklyScheduledReportDue(true, 1, true, true, PREVIOUS_WEEK_END, THURSDAY)).toBe(true)
  })

  it('handles Sunday (0) as the configured day, due on the last day of the week', () => {
    expect(isWeeklyScheduledReportDue(true, 0, true, true, undefined, SUNDAY)).toBe(true)
  })

  it('this is exactly the "runs on next open after the day, not exactly on the day" behavior: catches up on Thursday for a Monday-configured report', () => {
    expect(isWeeklyScheduledReportDue(true, 1, true, true, undefined, THURSDAY)).toBe(true)
  })
})

describe('isMonthlyScheduledReportDue (Article 12)', () => {
  it('is never due when month.enabled is explicitly false', () => {
    expect(isMonthlyScheduledReportDue(false, true, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due without an API key', () => {
    expect(isMonthlyScheduledReportDue(true, false, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due when the connectivity check reports unreachable', () => {
    expect(isMonthlyScheduledReportDue(true, true, false, undefined, THURSDAY)).toBe(false)
  })

  it('is due immediately when no month-scope report has ever been generated', () => {
    expect(isMonthlyScheduledReportDue(true, true, true, undefined, THURSDAY)).toBe(true)
  })

  it('is not due before ~30 days have passed since the last month-scope report', () => {
    expect(isMonthlyScheduledReportDue(true, true, true, '2026-06-20', '2026-07-10')).toBe(false) // 20 days
  })

  it('is not due at exactly 29 days', () => {
    expect(isMonthlyScheduledReportDue(true, true, true, '2026-06-20', '2026-07-19')).toBe(false) // 29 days
  })

  it('is due once ~30 days have elapsed', () => {
    expect(isMonthlyScheduledReportDue(true, true, true, '2026-06-20', '2026-07-20')).toBe(true) // 30 days
  })

  it('has no day-of-week/day-of-month gate, unlike weekly — pure elapsed time', () => {
    // 35 days later, regardless of what weekday today is.
    expect(isMonthlyScheduledReportDue(true, true, true, '2026-06-01', '2026-07-06')).toBe(true)
  })
})
