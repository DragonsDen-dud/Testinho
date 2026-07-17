import type { Habit, Todo, TimeBlock } from '../db/types'
import { timeBlockStartMinutes } from './timeBlockRange'

export interface TimelineEntry {
  kind: 'habit' | 'todo'
  id: string
  label: string
  timeLabel: string // "Morning" for a habit, "09:30" for a todo
}

/** Article 29 decision: merge only when every TimeBlock in the Space has a
 * structured range — an untimed block (even one unused by any habit) means
 * there's no reliable anchor for it, so the whole merge falls back. */
export function allTimeBlocksTimed(timeBlocks: TimeBlock[]): boolean {
  return timeBlocks.length > 0 && timeBlocks.every((tb) => !!tb.approxTimeRange)
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** A single chronologically-sorted timeline of scheduled habits and todos.
 * Only call when allTimeBlocksTimed(timeBlocks) is true. Habits without a
 * timeBlockId have no time to sort by and are omitted — callers should show
 * them in a separate "no time of day" group, same as the fallback view. */
export function buildMergedTimeline(
  habitsOnDate: Habit[],
  scheduledTodos: Todo[],
  timeBlocks: TimeBlock[],
): TimelineEntry[] {
  const blockById = new Map(timeBlocks.map((tb) => [tb.id, tb]))
  const habitEntries = habitsOnDate
    .filter((h): h is Habit & { timeBlockId: string } => !!h.timeBlockId && blockById.has(h.timeBlockId))
    .map((h) => {
      const block = blockById.get(h.timeBlockId)!
      return {
        kind: 'habit' as const,
        id: h.id,
        label: h.name,
        timeLabel: block.name,
        sortMinutes: timeBlockStartMinutes(block),
      }
    })
  const todoEntries = scheduledTodos.map((td) => ({
    kind: 'todo' as const,
    id: td.id,
    label: td.title,
    timeLabel: td.scheduledTime!,
    sortMinutes: toMinutes(td.scheduledTime!),
  }))
  return [...habitEntries, ...todoEntries]
    .sort((a, b) => a.sortMinutes - b.sortMinutes)
    .map(({ kind, id, label, timeLabel }) => ({ kind, id, label, timeLabel }))
}
