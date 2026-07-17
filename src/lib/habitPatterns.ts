import type { Habit, HabitLog, TimeBlock } from '../db/types'
import { addDays, todayKey, weekdayOf } from './date'
import { isScheduledOnDate } from './habitStrength'
import { findTimeBlockForTime } from './timeBlockRange'

const TRAILING_DAYS = 8 * 7
const MIN_OBSERVATIONS = 4
const THRESHOLD_PERCENTAGE_POINTS = 30

export interface WeekdayPattern {
  weekday: number // 0=Sun..6=Sat
  rate: number
  overallRate: number
  observations: number
}

/**
 * Article 26 — weekday pattern. A day only counts as an "observation" if it
 * was actually scheduled for this habit (respects schedule type and pause,
 * via isScheduledOnDate) and wasn't explicitly skipped. A past scheduled day
 * with no log counts as a miss, same treatment as Habit Strength — a purely
 * log-based count would silently ignore exactly the days a user forgot to
 * log, which is the signal this is trying to surface.
 */
export function computeWeekdayPattern(
  habit: Habit,
  logs: HabitLog[],
  asOfDate: string = todayKey(),
): WeekdayPattern | null {
  const byDate = new Map(logs.map((l) => [l.date, l]))
  const windowStart = addDays(asOfDate, -(TRAILING_DAYS - 1))
  const habitStart = habit.createdAt.slice(0, 10)
  const start = habitStart > windowStart ? habitStart : windowStart

  const perWeekday = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }))
  let totalDone = 0
  let totalObs = 0

  let cursor = start
  while (cursor <= asOfDate) {
    if (isScheduledOnDate(habit, cursor)) {
      const log = byDate.get(cursor)
      if (log?.status !== 'skip') {
        const isPastDay = cursor < asOfDate
        if (log || isPastDay) {
          const done = log?.status === 'done'
          const dow = weekdayOf(cursor)
          perWeekday[dow].total += 1
          totalObs += 1
          if (done) {
            perWeekday[dow].done += 1
            totalDone += 1
          }
        }
      }
    }
    cursor = addDays(cursor, 1)
  }

  if (totalObs === 0) return null
  const overallRate = totalDone / totalObs

  let worst: WeekdayPattern | null = null
  for (let dow = 0; dow < 7; dow++) {
    const { done, total } = perWeekday[dow]
    if (total < MIN_OBSERVATIONS) continue
    const rate = done / total
    const gapPoints = (overallRate - rate) * 100
    if (gapPoints >= THRESHOLD_PERCENTAGE_POINTS && (!worst || rate < worst.rate)) {
      worst = { weekday: dow, rate, overallRate, observations: total }
    }
  }
  return worst
}

export interface TimeOfDayPattern {
  timeBlockId: string
  timeBlockName: string
  share: number
  observations: number
}

/**
 * Article 26 — time-of-day pattern. Only measurable habits carry real
 * timestamps (HabitLog.entries[].timestamp); everything else is skipped
 * rather than guessed from Habit.timeBlockId, which is just the assigned
 * block, not evidence of when the habit actually happens. Threshold: a
 * block's share of entries must sit >=30 points above an even split across
 * the timed blocks, mirroring the weekday pattern's shape (points above a
 * baseline) rather than an arbitrary majority rule.
 */
export function computeTimeOfDayPattern(
  habit: Habit,
  logs: HabitLog[],
  timeBlocks: TimeBlock[],
  asOfDate: string = todayKey(),
): TimeOfDayPattern | null {
  if (!habit.measurable) return null
  const timedBlocks = timeBlocks.filter((tb) => tb.approxTimeRange)
  if (timedBlocks.length === 0) return null

  const windowStart = addDays(asOfDate, -(TRAILING_DAYS - 1))
  const counts = new Map<string, number>()
  let total = 0
  for (const log of logs) {
    if (log.date < windowStart || log.date > asOfDate) continue
    for (const entry of log.entries ?? []) {
      const d = new Date(entry.timestamp)
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const block = findTimeBlockForTime(hhmm, timedBlocks)
      if (block) {
        counts.set(block.id, (counts.get(block.id) ?? 0) + 1)
        total += 1
      }
    }
  }
  if (total < MIN_OBSERVATIONS) return null

  const evenShare = 1 / timedBlocks.length
  let best: TimeOfDayPattern | null = null
  for (const block of timedBlocks) {
    const count = counts.get(block.id) ?? 0
    const share = count / total
    const gapPoints = (share - evenShare) * 100
    if (gapPoints >= THRESHOLD_PERCENTAGE_POINTS && (!best || share > best.share)) {
      best = { timeBlockId: block.id, timeBlockName: block.name, share, observations: total }
    }
  }
  return best
}
