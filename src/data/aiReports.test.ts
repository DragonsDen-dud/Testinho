import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, ensureAppSettings } from '../db/db'
import { createHabit } from './habits'
import type { NewHabitInput } from './habits'

const { callAiProxy, checkAiHealth } = vi.hoisted(() => ({
  callAiProxy: vi.fn(),
  checkAiHealth: vi.fn(),
}))
vi.mock('../lib/aiClient', () => ({ callAiProxy, checkAiHealth }))

const { runFreeformQuery, runScheduledReportIfDue } = await import('./aiReports')

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

describe('runScheduledReportIfDue (Article 12)', () => {
  it('skips silently without a Claude API key, never calling checkAiHealth or the proxy', async () => {
    const result = await runScheduledReportIfDue(SPACE_ID, '2026-07-16')
    expect(result).toBeNull()
    expect(checkAiHealth).not.toHaveBeenCalled()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('skips silently when the connectivity check reports unreachable', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' })
    checkAiHealth.mockResolvedValue(false)

    const result = await runScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('skips when the configured weekday has not happened yet this week', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test', scheduledReportDayOfWeek: 5 }) // Friday
    checkAiHealth.mockResolvedValue(true)

    // 2026-07-15 is a Wednesday — Friday hasn't happened yet.
    const result = await runScheduledReportIfDue(SPACE_ID, '2026-07-15')

    expect(result).toBeNull()
    expect(callAiProxy).not.toHaveBeenCalled()
  })

  it('fires once due, saving a DiagnosticEntry with generatedBy scheduled / reportType scheduled_template, and records usage', async () => {
    await db.appSettings.update('singleton', { claudeApiKey: 'sk-test' }) // default Monday
    checkAiHealth.mockResolvedValue(true)
    callAiProxy.mockResolvedValue({ ok: true, text: 'Weekly summary.' })

    // 2026-07-16 is a Thursday — Monday already passed this week.
    const result = await runScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(result).not.toBeNull()
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

    await runScheduledReportIfDue(SPACE_ID, '2026-07-16')
    const second = await runScheduledReportIfDue(SPACE_ID, '2026-07-17')

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

    await runScheduledReportIfDue(SPACE_ID, '2026-07-16')

    expect(callAiProxy).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-5' }))
  })
})
