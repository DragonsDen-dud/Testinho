import { db } from '../db/db'
import { newId } from '../lib/id'
import { todayKey, weekBoundsOf } from '../lib/date'
import { resolveModelId } from '../lib/aiModels'
import { callAiProxy, checkAiHealth } from '../lib/aiClient'
import { isScheduledReportDue } from '../lib/scheduledReport'
import { recordAiUsage } from './ai'
import { upsertWeeklyAutoStats } from './diagnostics'
import type { DiagnosticEntry } from '../db/types'

export type FreeformQueryResult = { ok: true; text: string } | { ok: false; error: string }

/**
 * Article 16 — freeform_query, triggered from a habit detail screen.
 * `includeNorthStar` must be the caller's explicit per-call choice (a
 * checkbox the user ticked for this specific question), never a stored
 * default — see Article 16's boundary on North Star inclusion.
 */
export async function runFreeformQuery(params: {
  spaceId: string
  habitId?: string
  habitName?: string
  question: string
  includeNorthStar: boolean
}): Promise<FreeformQueryResult> {
  const settings = await db.appSettings.get('singleton')
  if (!settings?.claudeApiKey) return { ok: false, error: 'no_api_key' }

  const weekEntry = await upsertWeeklyAutoStats(params.spaceId)
  const autoStats = params.habitId
    ? ((weekEntry.autoStats as Record<string, unknown>)[params.habitId] ?? {})
    : weekEntry.autoStats

  let northStar: string | undefined
  if (params.includeNorthStar) {
    const space = await db.spaces.get(params.spaceId)
    northStar = space?.northStar || undefined
  }

  const model = resolveModelId(settings.aiModelPreference?.freeformQuery ?? 'haiku')
  const result = await callAiProxy({
    reportType: 'freeform_query',
    autoStats: autoStats as Record<string, unknown>,
    question: params.question,
    habitName: params.habitName,
    northStar,
    apiKey: settings.claudeApiKey,
    model,
  })
  if (!result.ok) return { ok: false, error: result.error }

  await recordAiUsage()

  const { start: periodStart, end: periodEnd } = weekBoundsOf(todayKey())
  const entry: DiagnosticEntry = {
    id: newId(),
    spaceId: params.spaceId,
    periodStart,
    periodEnd,
    scope: 'week',
    autoStats: autoStats as Record<string, unknown>,
    userFeedback: '',
    aiInsight: result.text,
    reportType: 'freeform_query',
    includedNorthStarContext: params.includeNorthStar,
    generatedBy: 'manual',
  }
  await db.diagnosticEntries.add(entry)

  return { ok: true, text: result.text }
}

/**
 * Article 12 — "check-on-open" scheduled report. Silent no-op (returns
 * null) whenever the pre-conditions aren't met or the call itself fails —
 * this runs unattended on app open, so there's no error toast to show and
 * nowhere to show it; it simply gets picked up again next time the app
 * opens on or after the configured day.
 */
export async function runScheduledReportIfDue(
  spaceId: string,
  today: string = todayKey(),
): Promise<DiagnosticEntry | null> {
  const settings = await db.appSettings.get('singleton')
  if (!settings?.claudeApiKey) return null

  const reachable = await checkAiHealth()
  if (!reachable) return null

  const scheduledEntries = await db.diagnosticEntries
    .where('spaceId')
    .equals(spaceId)
    .filter((e) => e.scope === 'week' && e.reportType === 'scheduled_template' && !!e.aiInsight)
    .toArray()
  const lastScheduledPeriodEnd = scheduledEntries
    .map((e) => e.periodEnd)
    .sort()
    .at(-1)

  const due = isScheduledReportDue(
    settings.scheduledReportEnabled,
    settings.scheduledReportDayOfWeek,
    true,
    reachable,
    lastScheduledPeriodEnd,
    today,
  )
  if (!due) return null

  const weekEntry = await upsertWeeklyAutoStats(spaceId, today)
  const model = resolveModelId(settings.aiModelPreference?.scheduledReport ?? 'haiku')
  const result = await callAiProxy({
    reportType: 'scheduled_template',
    autoStats: weekEntry.autoStats,
    apiKey: settings.claudeApiKey,
    model,
  })
  if (!result.ok) return null

  await recordAiUsage()

  const updated: DiagnosticEntry = {
    ...weekEntry,
    aiInsight: result.text,
    reportType: 'scheduled_template',
    generatedBy: 'scheduled',
    includedNorthStarContext: false,
  }
  await db.diagnosticEntries.put(updated)
  return updated
}
