import type { Habit, HabitLog, Todo, TodoStatus } from '../db/types'
import { computeHabitStrength, isScheduledOnDate, safeCreatedDate } from './habitStrength'
import { computeMoodCorrelation, type MoodCorrelation } from './moodCorrelation'
import { addDays, todayKey } from './date'

// E.6 — the spec text ("% выполнения") doesn't spell out a window, only
// that graphs must aggregate at query level (Article 17). 7/30/90 days is a
// reasonable, common framing for a trend view; it's a judgment call, not a
// literal spec requirement, and called out as such wherever this is surfaced.
export const COMPLETION_WINDOWS = [7, 30, 90] as const
export type CompletionWindowDays = (typeof COMPLETION_WINDOWS)[number]

export interface CompletionWindowStat {
  windowDays: CompletionWindowDays
  percent: number // 0-100, rounded; 0 when nothing was scheduled in the window at all
  scheduledDays: number
  doneDays: number
}

/**
 * Overall completion rate across all given habits, per trailing window.
 * Uses the same scheduled-day walk as Habit Strength/patterns
 * (isScheduledOnDate — respects pause and schedule type), and the same
 * done-status semantics as mood correlation: "done" already means "the good
 * thing happened" for both build and avoid habits (see moodCorrelation.ts),
 * so no type-specific inversion is needed here either.
 */
export function computeCompletionRates(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog[]>,
  asOfDate: string = todayKey(),
): CompletionWindowStat[] {
  return COMPLETION_WINDOWS.map((windowDays) => {
    const windowStart = addDays(asOfDate, -(windowDays - 1))
    let scheduledDays = 0
    let doneDays = 0

    for (const habit of habits) {
      const logs = logsByHabitId.get(habit.id) ?? []
      const byDate = new Map(logs.map((l) => [l.date, l]))
      const habitStart = safeCreatedDate(habit, asOfDate)
      const start = habitStart > windowStart ? habitStart : windowStart

      let cursor = start
      while (cursor <= asOfDate) {
        if (isScheduledOnDate(habit, cursor)) {
          const log = byDate.get(cursor)
          if (log?.status !== 'skip') {
            const isPastDay = cursor < asOfDate
            if (log || isPastDay) {
              scheduledDays += 1
              if (log?.status === 'done') doneDays += 1
            }
          }
        }
        cursor = addDays(cursor, 1)
      }
    }

    return {
      windowDays,
      percent: scheduledDays === 0 ? 0 : Math.round((doneDays / scheduledDays) * 100),
      scheduledDays,
      doneDays,
    }
  })
}

export interface DomainStrengthRow {
  domainId: string | null // null = no domain assigned
  buildAvg: number | null
  avoidAvg: number | null
  buildCount: number
  avoidCount: number
}

/** Average current Habit Strength per domain, split build/avoid (E.6, per Article A/21's strength formula). */
export function computeDomainHabitStrength(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog[]>,
  asOfDate: string = todayKey(),
): DomainStrengthRow[] {
  const buckets = new Map<string | null, { build: number[]; avoid: number[] }>()

  for (const habit of habits) {
    const key = habit.domainId ?? null
    if (!buckets.has(key)) buckets.set(key, { build: [], avoid: [] })
    const strength = computeHabitStrength(habit, logsByHabitId.get(habit.id) ?? [], asOfDate)
    buckets.get(key)![habit.habitType].push(strength)
  }

  return [...buckets.entries()].map(([domainId, { build, avoid }]) => ({
    domainId,
    buildAvg: build.length ? Math.round(average(build)) : null,
    avoidAvg: avoid.length ? Math.round(average(avoid)) : null,
    buildCount: build.length,
    avoidCount: avoid.length,
  }))
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export type TaskRatioStats = Record<TodoStatus, number> & { total: number }

/** Task status breakdown (E.6 "соотношение задач"). */
export function computeTaskRatio(todos: Todo[]): TaskRatioStats {
  const stats: TaskRatioStats = { open: 0, done: 0, someday: 0, archived: 0, total: todos.length }
  for (const t of todos) stats[t.status] += 1
  return stats
}

export interface HabitMoodCorrelationRow {
  habitId: string
  correlation: MoodCorrelation | null
}

/** Per-habit mood correlation (Article 35), aggregated into one list for the dashboard. */
export function computeMoodCorrelationByHabit(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog[]>,
): HabitMoodCorrelationRow[] {
  return habits.map((h) => ({
    habitId: h.id,
    correlation: computeMoodCorrelation(logsByHabitId.get(h.id) ?? []),
  }))
}
