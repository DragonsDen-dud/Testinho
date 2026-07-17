import { describe, expect, it } from 'vitest'
import { isTimeWithinRange, findTimeBlockForTime, timeBlockStartMinutes } from './timeBlockRange'
import type { TimeBlock } from '../db/types'

describe('isTimeWithinRange', () => {
  it('matches a normal (non-wrapping) range, start inclusive, end exclusive', () => {
    expect(isTimeWithinRange('06:00', { start: '06:00', end: '12:00' })).toBe(true)
    expect(isTimeWithinRange('11:59', { start: '06:00', end: '12:00' })).toBe(true)
    expect(isTimeWithinRange('12:00', { start: '06:00', end: '12:00' })).toBe(false)
    expect(isTimeWithinRange('05:59', { start: '06:00', end: '12:00' })).toBe(false)
  })

  it('matches a wrapping range that crosses midnight', () => {
    const range = { start: '18:00', end: '06:00' }
    expect(isTimeWithinRange('23:00', range)).toBe(true)
    expect(isTimeWithinRange('02:00', range)).toBe(true)
    expect(isTimeWithinRange('18:00', range)).toBe(true)
    expect(isTimeWithinRange('12:00', range)).toBe(false)
    expect(isTimeWithinRange('06:00', range)).toBe(false)
  })
})

describe('findTimeBlockForTime', () => {
  const blocks: TimeBlock[] = [
    { id: 'morning', spaceId: 's1', name: 'Morning', sortOrder: 0, approxTimeRange: { start: '06:00', end: '12:00' } },
    { id: 'evening', spaceId: 's1', name: 'Evening', sortOrder: 1, approxTimeRange: { start: '18:00', end: '06:00' } },
    { id: 'no-range', spaceId: 's1', name: 'Untimed', sortOrder: 2 },
  ]

  it('finds the containing block, skipping untimed ones', () => {
    expect(findTimeBlockForTime('08:00', blocks)?.id).toBe('morning')
    expect(findTimeBlockForTime('23:30', blocks)?.id).toBe('evening')
  })

  it('returns undefined when no block covers the time', () => {
    expect(findTimeBlockForTime('14:00', blocks)).toBeUndefined()
  })
})

describe('timeBlockStartMinutes', () => {
  it('sorts an untimed block last via MAX_SAFE_INTEGER', () => {
    const timed: TimeBlock = { id: 'a', spaceId: 's1', name: 'A', sortOrder: 0, approxTimeRange: { start: '09:00', end: '10:00' } }
    const untimed: TimeBlock = { id: 'b', spaceId: 's1', name: 'B', sortOrder: 1 }
    expect(timeBlockStartMinutes(timed)).toBe(9 * 60)
    expect(timeBlockStartMinutes(untimed)).toBeGreaterThan(timeBlockStartMinutes(timed))
  })
})
