import { db } from '../db/db'
import { newId } from '../lib/id'
import { todayKey, weekBoundsOf } from '../lib/date'
import { resolveModelId } from '../lib/aiModels'
import { callAiProxy, checkAiHealth } from '../lib/aiClient'
import { isWeeklyScheduledReportDue, isMonthlyScheduledReportDue } from '../lib/scheduledReport'
import { recordAiUsage } from './ai'
import { upsertWeeklyAutoStats, upsertMonthlyAutoStats } from './diagnostics'
import type { AppSettings, DiagnosticEntry } from '../db/types'

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

async function lastScheduledPeriodEndFor(spaceId: string, scope: 'week' | 'month'): Promise<string | undefined> {
  const entries = await db.diagnosticEntries
    .where('spaceId')
    .equals(spaceId)
    .filter((e) => e.scope === scope && e.reportType === 'scheduled_template' && !!e.aiInsight)
    .toArray()
  return entries
    .map((e) => e.periodEnd)
    .sort()
    .at(-1)
}

/**
 * Article 12/16 — the most recent genuinely-prior DiagnosticEntry for this
 * Space+scope (periodEnd strictly before the current period's start, so
 * the entry `upsertAutoStats` just upserted for *this* period is never
 * picked up as its own "prior" entry). `generatedBy` is deliberately not
 * filtered — a manual (freeform_query) entry's feedback is just as eligible
 * as a scheduled one's, since the requirement is "the user's last written
 * reflection of this scope," not "the last scheduled report specifically."
 * Only the single most recent prior entry is considered; an older entry
 * further back that happens to have feedback is not searched for as a
 * fallback if the immediately-prior one has none.
 */
async function getPriorPeriodFeedback(
  spaceId: string,
  scope: 'week' | 'month',
  currentPeriodStart: string,
): Promise<string | undefined> {
  const priorEntries = await db.diagnosticEntries
    .where('spaceId')
    .equals(spaceId)
    .filter((e) => e.scope === scope && e.periodEnd < currentPeriodStart)
    .toArray()
  const mostRecent = priorEntries.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0]
  return mostRecent?.userFeedback || undefined
}

/** Shared tail once a scope's due-check has already passed: refresh autoStats, call the AI, save. */
async function generateScheduledReport(
  spaceId: string,
  today: string,
  upsertAutoStats: (spaceId: string, asOfDate: string) => Promise<DiagnosticEntry>,
  settings: AppSettings,
): Promise<DiagnosticEntry | null> {
  const entry = await upsertAutoStats(spaceId, today)
  const priorFeedback = await getPriorPeriodFeedback(spaceId, entry.scope, entry.periodStart)
  const model = resolveModelId(settings.aiModelPreference?.scheduledReport ?? 'haiku')
  const result = await callAiProxy({
    reportType: 'scheduled_template',
    autoStats: entry.autoStats,
    priorFeedback,
    apiKey: settings.claudeApiKey!,
    model,
  })
  if (!result.ok) return null

  await recordAiUsage()

  const updated: DiagnosticEntry = {
    ...entry,
    aiInsight: result.text,
    reportType: 'scheduled_template',
    generatedBy: 'scheduled',
    includedNorthStarContext: false,
  }
  await db.diagnosticEntries.put(updated)
  return updated
}

/**
 * Article 12 — "check-on-open" week-scope scheduled report. Silent no-op
 * (returns null) whenever the pre-conditions aren't met or the call itself
 * fails — this runs unattended on app open, so there's no error toast to
 * show and nowhere to show it; it simply gets picked up again next time the
 * app opens on or after the configured day.
 */
export async function runWeeklyScheduledReportIfDue(
  spaceId: string,
  today: string = todayKey(),
): Promise<DiagnosticEntry | null> {
  const settings = await db.appSettings.get('singleton')
  if (!settings?.claudeApiKey) return null

  const reachable = await checkAiHealth()
  if (!reachable) return null

  const lastPeriodEnd = await lastScheduledPeriodEndFor(spaceId, 'week')
  const weekSettings = settings.scheduledAiReport?.week
  const due = isWeeklyScheduledReportDue(weekSettings?.enabled, weekSettings?.dayOfWeek, true, reachable, lastPeriodEnd, today)
  if (!due) return null

  return generateScheduledReport(spaceId, today, upsertWeeklyAutoStats, settings)
}

/**
 * Article 12 — "check-on-open" month-scope scheduled report. Independently
 * schedulable from the weekly one: its own enabled flag, its own ~30-day
 * elapsed check, its own DiagnosticEntry row (scope: 'month'), so it can
 * never starve or clobber the weekly report even when both are due on the
 * same app-open.
 */
export async function runMonthlyScheduledReportIfDue(
  spaceId: string,
  today: string = todayKey(),
): Promise<DiagnosticEntry | null> {
  const settings = await db.appSettings.get('singleton')
  if (!settings?.claudeApiKey) return null

  const reachable = await checkAiHealth()
  if (!reachable) return null

  const lastPeriodEnd = await lastScheduledPeriodEndFor(spaceId, 'month')
  const monthSettings = settings.scheduledAiReport?.month
  const due = isMonthlyScheduledReportDue(monthSettings?.enabled, true, reachable, lastPeriodEnd, today)
  if (!due) return null

  return generateScheduledReport(spaceId, today, upsertMonthlyAutoStats, settings)
}

/** Runs both cadence checks for a Space's check-on-open pass. Each scope is
 * fully independent — one failing, being disabled, or not being due has no
 * effect on the other. */
export async function runScheduledReportsIfDue(
  spaceId: string,
  today: string = todayKey(),
): Promise<{ week: DiagnosticEntry | null; month: DiagnosticEntry | null }> {
  const week = await runWeeklyScheduledReportIfDue(spaceId, today)
  const month = await runMonthlyScheduledReportIfDue(spaceId, today)
  return { week, month }
}
