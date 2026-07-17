import { describe, expect, it } from 'vitest'
import { resolveQuietHoursDelivery } from './quietHours'

const D = '2026-07-16' // a Thursday, arbitrary

describe('resolveQuietHoursDelivery (Article 41)', () => {
  it('fires immediately when quiet hours are undefined', () => {
    expect(resolveQuietHoursDelivery(undefined, D, new Date(2026, 6, 16, 23, 0))).toBe('fire')
  })

  it('fires immediately when quiet hours are explicitly disabled', () => {
    const qh = { enabled: false, start: '22:00', end: '07:00' }
    expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 23, 0))).toBe('fire')
  })

  describe('non-wrapping window (e.g. 13:00-15:00)', () => {
    const qh = { enabled: true, start: '13:00', end: '15:00' }

    it('queues when now is inside the window, same day', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 14, 0))).toBe('queue')
    })

    it('fires when now is outside the window, same day', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 9, 0))).toBe('fire')
    })

    it('fires right at the window boundary (end is exclusive)', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 15, 0))).toBe('fire')
    })

    it('drops once the day has moved on — never shows up stale tomorrow', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 17, 9, 0))).toBe('drop')
    })
  })

  describe('wrapping window (e.g. 22:00-07:00, spans midnight)', () => {
    const qh = { enabled: true, start: '22:00', end: '07:00' }

    it('queues when now is inside the window, same evening', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 23, 0))).toBe('queue')
    })

    it('still queues after midnight, on the day the window spills into', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 17, 3, 0))).toBe('queue')
    })

    it('fires once the window ends on the spilled-into day — this is the delayed queued delivery, not stale', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 17, 7, 0))).toBe('fire')
    })

    it('fires normally later that same spilled-into day, well after the window ended', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 17, 12, 0))).toBe('fire')
    })

    it('drops once we reach the day after the legitimate wrap day — genuinely stale', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 18, 8, 0))).toBe('drop')
    })

    it('fires immediately for a time outside the quiet window on the original day (unrelated to quiet hours)', () => {
      expect(resolveQuietHoursDelivery(qh, D, new Date(2026, 6, 16, 9, 0))).toBe('fire')
    })
  })
})
