import { db } from '../db/db'
import { newId } from '../lib/id'
import { todayKey, weekBoundsOf, monthBoundsOf } from '../lib/date'
import { computeWeekdayPattern, computeTimeOfDayPattern } from '../lib/habitPatterns'
import { computeMoodCorrelation } from '../lib/moodCorrelation'
import { listActiveHabits } from './habits'
import type { DiagnosticEntry } from '../db/types'

export interface HabitAutoStats {
  weekdayPattern: ReturnType<typeof computeWeekdayPattern>
  timeOfDayPattern: ReturnType<typeof computeTimeOfDayPattern>
  moodCorrelation: ReturnType<typeof computeMoodCorrelation>
}

async function computeAutoStatsForHabits(spaceId: string, asOfDate: string): Promise<Record<string, HabitAutoStats>> {
  const habits = await listActiveHabits(spaceId)
  const timeBlocks = await db.timeBlocks.where('spaceId').equals(spaceId).toArray()

  const autoStats: Record<string, HabitAutoStats> = {}
  for (const habit of habits) {
    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray()
    autoStats[habit.id] = {
      weekdayPattern: computeWeekdayPattern(habit, logs, asOfDate),
      timeOfDayPattern: computeTimeOfDayPattern(habit, logs, timeBlocks, asOfDate),
      moodCorrelation: computeMoodCorrelation(logs),
    }
  }
  return autoStats
}

/**
 * Articles 26/35 — computes local pattern insights + mood correlation for
 * every active habit in a Space and upserts one DiagnosticEntry per
 * Space+period+scope, so the Scheduled AI Report can read autoStats as
 * given facts instead of re-deriving them. Pure local computation, no AI
 * call. The underlying pattern/correlation functions always look at their
 * own fixed windows (trailing 8 weeks / all mood-tagged logs) regardless of
 * scope — what differs between week and month here is only the reporting
 * period recorded (periodStart/periodEnd) and how often it gets refreshed.
 */
async function upsertAutoStats(
  spaceId: string,
  scope: 'week' | 'month',
  periodStart: string,
  periodEnd: string,
  asOfDate: string,
): Promise<DiagnosticEntry> {
  const autoStats = await computeAutoStatsForHabits(spaceId, asOfDate)

  const existing = await db.diagnosticEntries
    .where('[spaceId+periodStart+scope]')
    .equals([spaceId, periodStart, scope])
    .first()

  const entry: DiagnosticEntry = {
    id: existing?.id ?? newId(),
    spaceId,
    periodStart,
    periodEnd,
    scope,
    autoStats,
    userFeedback: existing?.userFeedback ?? '',
    aiInsight: existing?.aiInsight,
    reportType: existing?.reportType,
    includedNorthStarContext: existing?.includedNorthStarContext ?? false,
    generatedBy: existing?.generatedBy ?? 'scheduled',
  }
  await db.diagnosticEntries.put(entry)
  return entry
}

export async function upsertWeeklyAutoStats(spaceId: string, asOfDate: string = todayKey()): Promise<DiagnosticEntry> {
  const { start, end } = weekBoundsOf(asOfDate)
  return upsertAutoStats(spaceId, 'week', start, end, asOfDate)
}

export async function upsertMonthlyAutoStats(spaceId: string, asOfDate: string = todayKey()): Promise<DiagnosticEntry> {
  const { start, end } = monthBoundsOf(asOfDate)
  return upsertAutoStats(spaceId, 'month', start, end, asOfDate)
}

/**
 * Article 10 target surface (DiagnosticEntry.userFeedback) — no UI wrote to
 * this field before this pass; a Scheduled AI Report banner is the natural
 * place to let the user jot a reaction to it.
 */
export async function updateDiagnosticFeedback(id: string, userFeedback: string): Promise<void> {
  await db.diagnosticEntries.update(id, { userFeedback })
}
