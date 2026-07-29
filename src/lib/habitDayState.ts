import type { Habit, HabitLog } from '../db/types'
import { isScheduledOnDate, safeCreatedDate } from './habitStrength'

export type HabitDayState = 'done' | 'not_done' | 'skip' | 'missed' | 'pending' | 'inactive'

export interface HabitDayInfo {
  state: HabitDayState
  /** Measurable habits only — the day's logged entries summed, present only on a 'done' day. */
  value?: number
}

/**
 * Per-day display state for the habit pattern grid (week/month view in
 * HabitDetailSheet). Mirrors the exact same date-driven rules
 * computeBuildStreak/computeHabitStrength already use — a past scheduled day
 * with no log is a miss, today with no log is neutral rather than a miss,
 * paused/unscheduled/before-creation days are excluded — just surfaced
 * per-day here instead of collapsed into a streak count. No new rule
 * invented; reuses isScheduledOnDate (which itself already excludes paused
 * days) and safeCreatedDate (the black-screen-incident-hardened helper, so
 * a malformed createdAt degrades to "no known history" instead of crashing).
 */
export function computeHabitDayInfo(habit: Habit, log: HabitLog | undefined, date: string, today: string): HabitDayInfo {
  if (date > today) return { state: 'inactive' }
  if (date < safeCreatedDate(habit, today)) return { state: 'inactive' }
  if (!isScheduledOnDate(habit, date)) return { state: 'inactive' }

  if (log?.status === 'done') {
    const value = habit.measurable ? log.entries?.reduce((sum, e) => sum + e.value, 0) : undefined
    return { state: 'done', value }
  }
  if (log?.status === 'skip') return { state: 'skip' }
  if (log?.status === 'not_done') return { state: 'not_done' }
  return { state: date === today ? 'pending' : 'missed' }
}
