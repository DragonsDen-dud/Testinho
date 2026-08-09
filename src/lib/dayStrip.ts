import type { Habit, HabitLog } from '../db/types'
import { isScheduledOnDate } from './habitStrength'
import { computeHabitDayInfo, isSuccessfulDay } from './habitDayState'
import { addDays } from './date'

/** How many trailing days the strip offers. Seven reads as "this week"
 * without a label and fits a phone row at a tappable size. */
export const DAY_STRIP_DAYS = 7

export interface DayStripDay {
  date: string
  isToday: boolean
  /** Habits actually scheduled on that day (Article 14 — a habit that isn't
   * scheduled on Tuesday is not "missed" on Tuesday). */
  scheduled: number
  /** Of those, the ones that ended the day successfully. For a build habit
   * that means done; for an avoid habit, staying clean. */
  done: number
  /** 0..1. Zero when nothing was scheduled, which the UI renders as an
   * empty ring rather than as 0% — "nothing to do" is not "did nothing". */
  ratio: number
  /** True when nothing was scheduled at all, so the UI can say so instead
   * of drawing a misleadingly empty ring. */
  restDay: boolean
}

/**
 * The trailing week as a completion overview.
 *
 * Deliberately reuses `isScheduledOnDate` and `computeHabitDayInfo` rather
 * than re-deriving "did this count?" — those two already encode pausing,
 * build-vs-avoid polarity, and the pending/missed distinction, and a second
 * implementation of that logic would drift from the tiles' own 7-day strip
 * within a round or two.
 *
 * `asOfDate` is the last (rightmost) day, normally today. Passing it
 * explicitly keeps this pure and testable.
 */
export function buildDayStrip(
  habits: Habit[],
  logsByHabit: Map<string, HabitLog[]>,
  asOfDate: string,
  days: number = DAY_STRIP_DAYS,
): DayStripDay[] {
  // One lookup map per habit, built once rather than per (habit, day).
  const byHabitDate = new Map<string, Map<string, HabitLog>>()
  for (const habit of habits) {
    const logs = logsByHabit.get(habit.id) ?? []
    byHabitDate.set(habit.id, new Map(logs.map((l) => [l.date, l])))
  }

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(asOfDate, -(days - 1 - i))
    let scheduled = 0
    let done = 0
    for (const habit of habits) {
      if (!isScheduledOnDate(habit, date)) continue
      scheduled++
      const log = byHabitDate.get(habit.id)?.get(date)
      const info = computeHabitDayInfo(habit, log, date, asOfDate)
      if (isSuccessfulDay(info.state)) done++
    }
    return {
      date,
      isToday: date === asOfDate,
      scheduled,
      done,
      ratio: scheduled === 0 ? 0 : done / scheduled,
      restDay: scheduled === 0,
    }
  })
}
