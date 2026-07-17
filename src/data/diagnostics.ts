import { db } from '../db/db'
import { newId } from '../lib/id'
import { todayKey, weekBoundsOf } from '../lib/date'
import { computeWeekdayPattern, computeTimeOfDayPattern } from '../lib/habitPatterns'
import { computeMoodCorrelation } from '../lib/moodCorrelation'
import { listActiveHabits } from './habits'
import type { DiagnosticEntry } from '../db/types'

export interface HabitAutoStats {
  weekdayPattern: ReturnType<typeof computeWeekdayPattern>
  timeOfDayPattern: ReturnType<typeof computeTimeOfDayPattern>
  moodCorrelation: ReturnType<typeof computeMoodCorrelation>
}

/**
 * Articles 26/35 — computes local pattern insights + mood correlation for
 * every active habit in a Space and upserts one DiagnosticEntry per
 * Space+week, so the future Scheduled AI Report can read autoStats as given
 * facts instead of re-deriving them. Pure local computation, no AI call.
 */
export async function upsertWeeklyAutoStats(spaceId: string, asOfDate: string = todayKey()): Promise<DiagnosticEntry> {
  const { start: periodStart, end: periodEnd } = weekBoundsOf(asOfDate)
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

  const existing = await db.diagnosticEntries
    .where('[spaceId+periodStart+scope]')
    .equals([spaceId, periodStart, 'week'])
    .first()

  const entry: DiagnosticEntry = {
    id: existing?.id ?? newId(),
    spaceId,
    periodStart,
    periodEnd,
    scope: 'week',
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
