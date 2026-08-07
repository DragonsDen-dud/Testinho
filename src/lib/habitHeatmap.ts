import type { Habit, HabitLog } from '../db/types'
import { addDays, weekdayOf } from './date'
import { computeHabitDayInfo, isSuccessfulDay, type HabitDayInfo } from './habitDayState'
import { safeCreatedDate } from './habitStrength'

/**
 * STOA-5 Part C — the pure layout/derivation half of the HabitKit-style
 * contribution heatmap. Kept out of the component so the week-bucketing and
 * intensity maths are unit-testable without a DOM.
 *
 * Shape follows a real GitHub contribution graph, which is what makes it
 * legible at a glance: one column per calendar week, seven rows (Mon..Sun),
 * oldest week on the left. Every column is a full 7 cells even at the edges
 * of the range — a ragged first/last column is the single fastest way to
 * make a grid like this read as broken rather than dense.
 */

export interface HeatmapCell {
  date: string
  /** Absent for padding cells that fall outside the habit's real range. */
  info?: HabitDayInfo
  /**
   * 0 = nothing to show, 1 = a successful day. Measurable habits scale
   * between the two by how much of the target the day actually hit, which
   * is what gives a HabitKit-style grid its depth instead of a flat
   * on/off checkerboard. Non-measurable habits are deliberately binary —
   * inventing gradations for a yes/no habit would be decoration, not data.
   */
  intensity: number
}

export interface HeatmapWeek {
  /** Monday of this column. */
  startDate: string
  cells: HeatmapCell[]
}

export interface HeatmapMonthLabel {
  /** Index into the weeks array where this month's first full week sits. */
  weekIndex: number
  /** YYYY-MM, formatted by the caller so locale stays a UI concern. */
  month: string
}

export interface Heatmap {
  weeks: HeatmapWeek[]
  monthLabels: HeatmapMonthLabel[]
}

/** Monday of the ISO week containing `date`. */
function mondayOf(date: string): string {
  const dow = weekdayOf(date) // 0=Sun..6=Sat
  const backtrack = dow === 0 ? 6 : dow - 1
  return addDays(date, -backtrack)
}

function intensityFor(habit: Habit, info: HabitDayInfo): number {
  if (!isSuccessfulDay(info.state)) return 0
  const target = habit.measurable?.targetValue
  if (!target || target <= 0 || info.value === undefined) return 1
  // Capped at 1: exceeding the target is already recorded as `bonus`
  // (Article 24) and must never render as a bigger reward here.
  return Math.max(0.25, Math.min(info.value / target, 1))
}

/**
 * Builds the grid for `habit` over the trailing `weeks` calendar weeks
 * ending in the week containing `today`.
 *
 * Days before the habit existed, after today, unscheduled, or paused come
 * back as `inactive` from computeHabitDayInfo and render as the faintest
 * cell — present for grid alignment, never as a claim about that day.
 */
export function buildHabitHeatmap(
  habit: Habit,
  logs: HabitLog[],
  today: string,
  weeks: number,
): Heatmap {
  const logsByDate = new Map(logs.map((l) => [l.date, l]))
  const lastMonday = mondayOf(today)
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1))

  const out: HeatmapWeek[] = []
  const monthLabels: HeatmapMonthLabel[] = []
  let lastLabelledMonth = ''

  for (let w = 0; w < weeks; w += 1) {
    const startDate = addDays(firstMonday, w * 7)
    const cells: HeatmapCell[] = []
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(startDate, d)
      const info = computeHabitDayInfo(habit, logsByDate.get(date), date, today)
      cells.push({ date, info, intensity: intensityFor(habit, info) })
    }
    out.push({ startDate, cells })

    // Label a column when its Monday opens a new month — matches how
    // GitHub places its month captions, and avoids a label on a column
    // that only shows the tail of the previous month.
    const month = startDate.slice(0, 7)
    if (month !== lastLabelledMonth) {
      monthLabels.push({ weekIndex: w, month })
      lastLabelledMonth = month
    }
  }

  return { weeks: out, monthLabels }
}

/**
 * How many trailing weeks are worth drawing for this habit: enough to cover
 * its whole life, capped so an old habit doesn't produce an unusable
 * hundred-column strip, floored so a brand-new habit still gets a grid with
 * a sense of scale rather than a single lonely column.
 */
export function heatmapWeekCount(habit: Habit, today: string, min = 16, max = 53): number {
  const created = safeCreatedDate(habit, today)
  const createdMonday = mondayOf(created)
  const todayMonday = mondayOf(today)
  const days = Math.round(
    (Date.parse(`${todayMonday}T00:00:00Z`) - Date.parse(`${createdMonday}T00:00:00Z`)) / 86400000,
  )
  const lived = Math.floor(days / 7) + 1
  return Math.max(min, Math.min(lived, max))
}
