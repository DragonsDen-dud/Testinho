import { describe, expect, it } from 'vitest'
import { nextUsageState } from './aiUsage'

describe('nextUsageState (Article 38)', () => {
  it('starts a fresh period at callCount 1 when there is no prior usage', () => {
    const result = nextUsageState(undefined, '2026-07-01')
    expect(result).toEqual({ callCount: 1, currentPeriodStart: '2026-07-01' })
  })

  it('increments callCount within the same 30-day period', () => {
    const result = nextUsageState({ callCount: 5, currentPeriodStart: '2026-07-01' }, '2026-07-15')
    expect(result.callCount).toBe(6)
    expect(result.currentPeriodStart).toBe('2026-07-01')
  })

  it('resets to callCount 1 with a new period start once 30 days have elapsed', () => {
    const result = nextUsageState({ callCount: 42, currentPeriodStart: '2026-06-01' }, '2026-07-02')
    expect(result.callCount).toBe(1)
    expect(result.currentPeriodStart).toBe('2026-07-02')
  })

  it('does not reset at exactly 29 days', () => {
    const result = nextUsageState({ callCount: 3, currentPeriodStart: '2026-07-01' }, '2026-07-30')
    expect(result.callCount).toBe(4)
    expect(result.currentPeriodStart).toBe('2026-07-01')
  })

  it('preserves softCapWarningThreshold across a reset', () => {
    const result = nextUsageState(
      { callCount: 100, currentPeriodStart: '2026-06-01', softCapWarningThreshold: 50 },
      '2026-07-05',
    )
    expect(result.softCapWarningThreshold).toBe(50)
  })
})
