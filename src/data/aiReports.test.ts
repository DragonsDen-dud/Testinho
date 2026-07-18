import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, ensureAppSettings } from '../db/db'
import { createHabit } from './habits'
import type { NewHabitInput } from './habits'

const { callAiProxy, checkAiHealth } = vi.hoisted(() => ({
  callAiProxy: vi.fn(),
  checkAiHealth: vi.fn(),
}))
vi.mock('../lib/aiClient', () => ({ callAiProxy, checkAiHealth }))

const { runFreeformQuery, runWeeklyScheduledReportIfDue, runMonthlyScheduledReportIfDue, runScheduledReportsIfDue } =
  await import('./aiReports')

const SPACE_ID = 'space-1'

function habitInput(name: string): NewHabitInput {
  return {
    spaceId: SPACE_ID,
    name,
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
  }
}

beforeEach(async () => {
  await db.appSettings.clear()
  await db.spaces.clear()
  await db.habits.clear()
  await db.habitLogs.clear()
  await db.diagnosticEntries.clear()
  await ensureAppSettings()
  await db.spaces.add({ id: SPACE_ID, name: 'Test', icon: '⭐', color: '#000', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' })
  callAiProxy.mockReset()
  checkAiHealth.mockReset()
})

describe('runFreeformQuery (Article 16)', () => {
  it('refuses without a Claude API key, and never calls the proxy', async () => {
    const result = await runFreeformQuery({ spaceId: SPACE_ID, question: 'How am I doing?', includeNorthStar: false })
    expect(result).toEqual({ ok: false, error: 'no_api_key' })
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('on success, records usage and saves a DiagnosticEntry with reportType freeform_query / generatedBy manual', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test', activeSpaceId: SPACE_ID })
    callAiProxy.mockResolvedValue({ ok: true, text: 'Here is your answer.' })

    const result = await runFreeformQuery({ spaceId: SPACE_ID, question: 'How am I doing?', includeNorthStar: false })

    expect(result).toEqual({ ok: true, text: 'Here is your answer.' })
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage?.callCount).toBe(1)

    // runFreeformQuery also refreshes the Space's autoStats-tracking row
    // (upsertWeeklyAutoStats) as a side effect, ahead of the AI call — that
    // row is separate from, and always in addition to, this call's own
    // freeform_query record (each question gets its own historical row
    // rather than overwriting the week's autoStats slot).
    const entries = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    const freeformEntries = entries.filter((e) => e.reportType === 'freeform_query')
    expect(freeformEntries).toHaveLength(1)
    expect(freeformEntries[0].generatedBy).toBe('manual')
    expect(freeformEntries[0].aiInsight).toBe('Here is your answer.')
    expect(freeformEntries[0].includedNorthStarContext).toBe(false)
  })

  it('does not increment usage or save a freeform_query entry when the proxy call fails', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    callAiProxy.mockResolvedValue({ ok: false, error: 'network_error' })

    const result = await runFreeformQuery({ spaceId: SPACE_ID, question: 'x', includeNorthStar: false })

    expect(result).toEqual({ ok: false, error: 'network_error' })
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage).toBeUndefined()
    const entries = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    expect(entries.filter((e) => e.reportType === 'freeform_query')).toHaveLength(0)
  })

  it('North Star is strictly opt-in: omitted from the proxy call when includeNorthStar is false, even with Space.northStar set', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    await db.spaces.update(SPACE_ID, { northStar: 'Be present for my family.' })
    callAiProxy.mockResolvedValue({ ok: true, text: 'ok' })

    await runFreeformQuery({ spaceId: SPACE_ID, question: 'x', includeNorthStar: false })

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ northStar: undefined }))
  })

  it('North Star is included in the proxy call only when the caller explicitly opts in for that call', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    await db.spaces.update(SPACE_ID, { northStar: 'Be present for my family.' })
    callAiProxy.mockResolvedValue({ ok: true, text: 'ok' })

    await runFreeformQuery({ spaceId: SPACE_ID, question: 'x', includeNorthStar: true })

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ northStar: 'Be present for my family.' }))
  })

  it('respects the freeformQuery model preference in the outgoing request', async () => {
    await db.appSettings.update('singleton', {
      claudeApiKey: 'sk-test',
      aiModelPreference: { scheduledReport: 'haiku', freeformQuery: 'sonnet' },
    })
    callAiProxy.mockResolvedValue({ ok: true, text: 'ok' })

    await runFreeformQuery({ spaceId: SPACE_ID, question: 'x', includeNorthStar: false })

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-5' }))
  })

  it('narrows autoStats to just the given habit when habitId is passed', async () => {
    const habit = await createHabit(habitInput('Read'))
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    callAiProxy.mockResolvedValue({ ok: true, text: 'ok' })

    await runFreeformQuery({ spaceId: SPACE_ID, habitId: habit.id, question: 'x', includeNorthStar: false })

    const sentAutoStats = callAiProxy.mock.calls[0][0].autoStats
    expect(sentAutoStats).toHaveProperty('weekdayPattern')
    expect(sentAutoStats).not.toHaveProperty(habit.id)
  })
})

describe('runWeeklyScheduledReportIfDue (Article 12)', () => {
  it('skips silently without a Claude API key, never calling checkAiHealth or the proxy', async () => {
    const result = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')
    expect(result).toBeNull()
    expect(checkAiHealth).not.toHaveBeenCalled()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('skips silently when the connectivity check reports unreachable', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(false)

    const result = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('skips when the configured weekday has not happened yet this week', async () => {
    await db.appSettings.update('singleton', {
      claudeApiKey: 'sk-test',
      scheduledAiReport: { week: { enabled: true, dayOfWeek: 5 }, month: { enabled: true } }, // Friday
    })
    checkAiHealth.mockResolvedValue(true)

    // 2026-07-15 is a Wednesday — Friday hasn't happened yet.
    const result = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-15')

    expect(result).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('fires once due, saving a DiagnosticEntry with generatedBy scheduled / reportType scheduled_template, and records usage', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' }) // default Monday
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    // 2026-07-16 is a Thursday — Monday already passed this week.
    const result = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).not.toBeNull()
    expect(result?.scope).toBe('week')
    expect(result?.reportType).toBe('scheduled_template')
    expect(result?.generatedBy).toBe('scheduled')
    expect(result?.aiInsight).toBe('Weekly summary.')
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage?.callCount).toBe(1)
  })

  it('does not fire twice for the same week', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')
    const second = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-17')

    expect(second).toBeNull()
    expect(callAiProxy).toHaveBeenCalledTimes(1)
  })

  it('respects the scheduledReport model preference', async () => {
    await db.appSettings.update('singleton', {
      claudeApiKey: 'sk-test',
      aiModelPreference: { scheduledReport: 'sonnet', freeformQuery: 'haiku' },
    })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'ok' })

    await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-5' }))
  })

  it('is unaffected by month.enabled being false — independently schedulable', async () => {
    await db.appSettings.update('singleton', {
      claudeApiKey: 'sk-test',
      scheduledAiReport: { week: { enabled: true, dayOfWeek: 1 }, month: { enabled: false } },
    })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    const result = await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).not.toBeNull()
  })
})

describe('runMonthlyScheduledReportIfDue (Article 12 month scope)', () => {
  it('skips silently without a Claude API key', async () => {
    const result = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-16')
    expect(result).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('does not fire before ~30 days have passed since the last month-scope report', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Monthly summary.' })

    const first = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-01')
    expect(first).not.toBeNull()
    callAiProxy.mockClear()

    // Only 10 days later — should not fire again yet.
    const second = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-11')
    expect(second).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('fires again once ~30 days have elapsed, saving scope: month / generatedBy scheduled', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Monthly summary.' })

    // The first call's periodEnd is the last day of June (2026-06-30) — the
    // ~30-day clock runs from there, not from the asOfDate passed in.
    await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-06-01')
    const result = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-31') // 31 days after 2026-06-30

    expect(result).not.toBeNull()
    expect(result?.scope).toBe('month')
    expect(result?.generatedBy).toBe('scheduled')
  })

  it('is unaffected by week.enabled being false — independently schedulable', async () => {
    await db.appSettings.update('singleton', {
      claudeApiKey: 'sk-test',
      scheduledAiReport: { week: { enabled: false, dayOfWeek: 1 }, month: { enabled: true } },
    })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Monthly summary.' })

    const result = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).not.toBeNull()
  })
})

describe('prior-period feedback context (Article 12/16)', () => {
  it('omits priorFeedback when this is the first-ever week-scope report for the Space', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ priorFeedback: undefined }))
  })

  it("includes the most recent prior week-scope entry's feedback, regardless of generatedBy", async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    // A prior week (2026-07-06..2026-07-12), generatedBy 'manual' (e.g. a
    // freeform_query entry) — still eligible; the requirement is "the
    // user's last written reflection of this scope," not "the last
    // scheduled report specifically."
    await db.diagnosticEntries.put({
      id: 'prior-week',
      spaceId: SPACE_ID,
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      scope: 'week',
      autoStats: {},
      userFeedback: 'Tuesdays were rough this week.',
      aiInsight: 'Some earlier insight.',
      reportType: 'freeform_query',
      includedNorthStarContext: false,
      generatedBy: 'manual',
    })

    await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ priorFeedback: 'Tuesdays were rough this week.' }))
  })

  it('omits priorFeedback when the most recent prior entry has empty feedback, even if an older one has some', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    await db.diagnosticEntries.put({
      id: 'older-week',
      spaceId: SPACE_ID,
      periodStart: '2026-06-29',
      periodEnd: '2026-07-05',
      scope: 'week',
      autoStats: {},
      userFeedback: 'An older reflection.',
      aiInsight: 'x',
      reportType: 'scheduled_template',
      includedNorthStarContext: false,
      generatedBy: 'scheduled',
    })
    await db.diagnosticEntries.put({
      id: 'most-recent-prior-week',
      spaceId: SPACE_ID,
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      scope: 'week',
      autoStats: {},
      userFeedback: '', // no feedback written for the most recent prior period
      aiInsight: 'y',
      reportType: 'scheduled_template',
      includedNorthStarContext: false,
      generatedBy: 'scheduled',
    })

    await runWeeklyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ priorFeedback: undefined }))
  })

  it('a week-scope entry never leaks into a month-scope report\'s priorFeedback', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Monthly summary.' })

    await db.diagnosticEntries.put({
      id: 'prior-week-only',
      spaceId: SPACE_ID,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-07',
      scope: 'week',
      autoStats: {},
      userFeedback: 'A week-scope reflection.',
      aiInsight: 'x',
      reportType: 'scheduled_template',
      includedNorthStarContext: false,
      generatedBy: 'scheduled',
    })

    await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ priorFeedback: undefined }))
  })

  it("a prior month-scope entry's feedback is picked up for the next month-scope report", async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Monthly summary.' })

    const first = await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-06-01')
    await db.diagnosticEntries.update(first!.id, { userFeedback: 'June was mixed.' })
    callAiProxy.mockClear()

    await runMonthlyScheduledReportIfDue(SPACE_ID, '2026-07-31') // 31 days after June's periodEnd

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ priorFeedback: 'June was mixed.' }))
  })
})

describe('runScheduledReportsIfDue — both scopes on the same app-open (Article 12)', () => {
  it('fires both week and month on the same check when both are due, as two separate non-clobbering rows', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Summary.' })

    // 2026-07-16 is a Thursday — Monday (default week day) already passed,
    // and there's no prior month-scope report, so both are due.
    const { week, month } = await runScheduledReportsIfDue(SPACE_ID, '2026-07-16')

    expect(week).not.toBeNull()
    expect(month).not.toBeNull()
    expect(week?.scope).toBe('week')
    expect(month?.scope).toBe('month')
    expect(callAiProxy).toHaveBeenCalledTimes(2)

    const rows = await db.diagnosticEntries.where('spaceId').equals(SPACE_ID).toArray()
    const scheduledRows = rows.filter((r) => r.reportType === 'scheduled_template')
    expect(scheduledRows).toHaveLength(2)
  })

  it('does not double-fire on a second check-on-open pass the same day', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Summary.' })

    await runScheduledReportsIfDue(SPACE_ID, '2026-07-16')
    callAiProxy.mockClear()
    const second = await runScheduledReportsIfDue(SPACE_ID, '2026-07-16')

    expect(second.week).toBeNull()
    expect(second.month).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('one scope failing to generate does not block or clobber the other', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(true)
    // First call (week) fails, second call (month) succeeds.
    callAiProxy.mockResolvedValueOnce({ ok: false, error: 'network_error' }).mockResolvedValueOnce({ ok: true, text: 'Monthly ok.' })

    const { week, month } = await runScheduledReportsIfDue(SPACE_ID, '2026-07-16')

    expect(week).toBeNull()
    expect(month).not.toBeNull()
    expect(month?.aiInsight).toBe('Monthly ok.')
  })
})
