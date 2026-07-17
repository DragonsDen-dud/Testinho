import { describe, expect, it } from 'vitest'
import { allTimeBlocksTimed, buildMergedTimeline } from './dayTimeline'
import type { Habit, TimeBlock, Todo } from '../db/types'

function habit(id: string, name: string, timeBlockId?: string): Habit {
  return {
    id,
    spaceId: 's1',
    name,
    habitType: 'build',
    timeBlockId,
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  }
}

function todo(id: string, title: string, scheduledTime: string): Todo {
  return {
    id,
    spaceId: 's1',
    title,
    scheduledTime,
    criticalReminder: false,
    status: 'open',
    createdAt: '2026-06-01T00:00:00.000Z',
  }
}

describe('allTimeBlocksTimed', () => {
  it('is false when the space has no TimeBlocks at all', () => {
    expect(allTimeBlocksTimed([])).toBe(false)
  })

  it('is false when any block lacks approxTimeRange, even if unused by any habit', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', spaceId: 's1', name: 'A', sortOrder: 0, approxTimeRange: { start: '06:00', end: '12:00' } },
      { id: 'b', spaceId: 's1', name: 'B', sortOrder: 1 },
    ]
    expect(allTimeBlocksTimed(blocks)).toBe(false)
  })

  it('is true when every block has approxTimeRange', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', spaceId: 's1', name: 'A', sortOrder: 0, approxTimeRange: { start: '06:00', end: '12:00' } },
      { id: 'b', spaceId: 's1', name: 'B', sortOrder: 1, approxTimeRange: { start: '12:00', end: '18:00' } },
    ]
    expect(allTimeBlocksTimed(blocks)).toBe(true)
  })
})

describe('buildMergedTimeline', () => {
  const morning: TimeBlock = { id: 'morning', spaceId: 's1', name: 'Morning', sortOrder: 0, approxTimeRange: { start: '06:00', end: '12:00' } }
  const evening: TimeBlock = { id: 'evening', spaceId: 's1', name: 'Evening', sortOrder: 1, approxTimeRange: { start: '18:00', end: '06:00' } }

  it('produces a single chronologically-sorted sequence mixing habits and todos', () => {
    const habits = [habit('h1', 'Stretch', 'morning'), habit('h2', 'Wind down', 'evening')]
    const todos = [todo('t1', 'Standup', '09:00'), todo('t2', 'Dinner plan', '19:00')]
    const timeline = buildMergedTimeline(habits, todos, [morning, evening])

    expect(timeline.map((e) => e.label)).toEqual(['Stretch', 'Standup', 'Wind down', 'Dinner plan'])
    expect(timeline.map((e) => e.kind)).toEqual(['habit', 'todo', 'habit', 'todo'])
  })

  it('omits habits with no timeBlockId — they have nothing to sort by', () => {
    const habits = [habit('h1', 'Stretch', 'morning'), habit('h2', 'No block set')]
    const timeline = buildMergedTimeline(habits, [], [morning, evening])
    expect(timeline.map((e) => e.label)).toEqual(['Stretch'])
  })

  it('places an evening (wrapping) habit correctly relative to a late-morning todo', () => {
    const habits = [habit('h1', 'Late night wind-down', 'evening')]
    const todos = [todo('t1', 'Late morning call', '11:00')]
    const timeline = buildMergedTimeline(habits, todos, [morning, evening])
    // Evening starts at 18:00 (1080 min), the todo at 11:00 (660 min) — todo first.
    expect(timeline.map((e) => e.label)).toEqual(['Late morning call', 'Late night wind-down'])
  })
})
