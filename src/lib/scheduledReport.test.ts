import { describe, expect, it } from 'vitest'
import { isScheduledReportDue } from './scheduledReport'

// 2026-07-13 is a Monday, so this week runs 2026-07-13 (Mon) .. 2026-07-19 (Sun).
const WEDNESDAY = '2026-07-15'
const THURSDAY = '2026-07-16'
const SUNDAY = '2026-07-19'
const PREVIOUS_WEEK_END = '2026-07-12'
const THIS_WEEK_END = '2026-07-19'

describe('isScheduledReportDue (Article 12)', () => {
  it('is never due when scheduledReportEnabled is explicitly false', () => {
    expect(isScheduledReportDue(false, 1, true, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due without an API key', () => {
    expect(isScheduledReportDue(true, 1, false, true, undefined, THURSDAY)).toBe(false)
  })

  it('is never due when the connectivity check reports unreachable', () => {
    expect(isScheduledReportDue(true, 1, true, false, undefined, THURSDAY)).toBe(false)
  })

  it('is not due when the configured weekday has not happened yet this week', () => {
    // Friday (5) configured, but today is only Wednesday.
    expect(isScheduledReportDue(true, 5, true, true, undefined, WEDNESDAY)).toBe(false)
  })

  it('is due once the configured weekday has occurred this week and nothing generated yet', () => {
    // Monday (1, the default) has already passed by Thursday.
    expect(isScheduledReportDue(true, 1, true, true, undefined, THURSDAY)).toBe(true)
  })

  it('defaults to Monday when dayOfWeek is undefined', () => {
    expect(isScheduledReportDue(true, undefined, true, true, undefined, THURSDAY)).toBe(true)
  })

  it('is not due if a scheduled report was already generated for this week', () => {
    expect(isScheduledReportDue(true, 1, true, true, THIS_WEEK_END, THURSDAY)).toBe(false)
  })

  it('is due again once a new week has started, even if last week was generated', () => {
    expect(isScheduledReportDue(true, 1, true, true, PREVIOUS_WEEK_END, THURSDAY)).toBe(true)
  })

  it('handles Sunday (0) as the configured day, due on the last day of the week', () => {
    expect(isScheduledReportDue(true, 0, true, true, undefined, SUNDAY)).toBe(true)
  })

  it('this is exactly the "runs on next open after the day, not exactly on the day" behavior: catches up on Thursday for a Monday-configured report', () => {
    expect(isScheduledReportDue(true, 1, true, true, undefined, THURSDAY)).toBe(true)
  })
})
