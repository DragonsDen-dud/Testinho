import { describe, expect, it } from 'vitest'
import { mostRecentDomainId, midTierPriorityLevel, currentHHMM, defaultTimeBlockId } from './quickCreateDefaults'
import type { PriorityLevel, TimeBlock } from '../db/types'

describe('mostRecentDomainId', () => {
  it('picks the domain of the most recently created item', () => {
    const items = [
      { domainId: 'd1', createdAt: '2026-07-01T00:00:00.000Z' },
      { domainId: 'd2', createdAt: '2026-07-15T00:00:00.000Z' },
      { domainId: 'd3', createdAt: '2026-07-10T00:00:00.000Z' },
    ]
    expect(mostRecentDomainId(items)).toBe('d2')
  })

  it('ignores items with no domainId when finding the most recent', () => {
    const items = [
      { domainId: 'd1', createdAt: '2026-07-01T00:00:00.000Z' },
      { createdAt: '2026-07-20T00:00:00.000Z' }, // newest overall, but no domain
    ]
    expect(mostRecentDomainId(items)).toBe('d1')
  })

  it('returns undefined when nothing has ever had a domain', () => {
    expect(mostRecentDomainId([{ createdAt: '2026-07-01T00:00:00.000Z' }])).toBeUndefined()
  })

  it('returns undefined for an empty list', () => {
    expect(mostRecentDomainId([])).toBeUndefined()
  })
})

function priority(id: string, sortOrder: number): PriorityLevel {
  return { id, spaceId: 'space-1', name: id, sortOrder, weight: 1 }
}

describe('midTierPriorityLevel', () => {
  it('picks the middle of an odd-length list, not the highest', () => {
    const levels = [priority('high', 0), priority('mid', 1), priority('low', 2)]
    expect(midTierPriorityLevel(levels)?.id).toBe('mid')
  })

  it('picks the lower-middle of an even-length list', () => {
    const levels = [priority('a', 0), priority('b', 1), priority('c', 2), priority('d', 3)]
    expect(midTierPriorityLevel(levels)?.id).toBe('b')
  })

  it('returns the only level when there is exactly one', () => {
    expect(midTierPriorityLevel([priority('only', 0)])?.id).toBe('only')
  })

  it('returns undefined when there are no priority levels at all', () => {
    expect(midTierPriorityLevel([])).toBeUndefined()
  })
})

describe('currentHHMM', () => {
  it('formats hours and minutes zero-padded', () => {
    expect(currentHHMM(new Date(2026, 6, 16, 9, 5))).toBe('09:05')
    expect(currentHHMM(new Date(2026, 6, 16, 23, 59))).toBe('23:59')
  })
})

function timeBlock(id: string, sortOrder: number, range?: { start: string; end: string }): TimeBlock {
  return { id, spaceId: 'space-1', name: id, sortOrder, approxTimeRange: range }
}

describe('defaultTimeBlockId', () => {
  it('picks the block whose approxTimeRange contains the current time', () => {
    const blocks = [
      timeBlock('morning', 0, { start: '06:00', end: '12:00' }),
      timeBlock('afternoon', 1, { start: '12:00', end: '18:00' }),
      timeBlock('evening', 2, { start: '18:00', end: '23:59' }),
    ]
    expect(defaultTimeBlockId(blocks, new Date(2026, 6, 16, 14, 0))).toBe('afternoon')
  })

  it('falls back to the first block when none are timed', () => {
    const blocks = [timeBlock('untimed-a', 0), timeBlock('untimed-b', 1)]
    expect(defaultTimeBlockId(blocks, new Date(2026, 6, 16, 14, 0))).toBe('untimed-a')
  })

  it('returns undefined when there are no time blocks at all', () => {
    expect(defaultTimeBlockId([], new Date())).toBeUndefined()
  })
})
