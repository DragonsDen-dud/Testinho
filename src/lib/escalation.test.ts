import { describe, expect, it } from 'vitest'
import { nextEscalationTiming } from './escalation'

const SENT_AT = '2026-07-16T09:00:00.000Z'

function stateAt(overrides: Partial<{ state: 'sent' | 'acknowledged' | 'snoozed' | 'dismissed' | 'lapsed_for_day'; sentAt: string; followUpSent: boolean; snoozeUntil?: string }> = {}) {
  return { state: 'sent' as const, sentAt: SENT_AT, followUpSent: false, ...overrides }
}

describe('nextEscalationTiming (Article 40)', () => {
  it('is none before the escalation window has elapsed', () => {
    const now = new Date('2026-07-16T09:30:00.000Z') // 30 min later, window is 45
    expect(nextEscalationTiming(stateAt(), now, 45)).toBe('none')
  })

  it('is due exactly at the escalation window', () => {
    const now = new Date('2026-07-16T09:45:00.000Z')
    expect(nextEscalationTiming(stateAt(), now, 45)).toBe('due')
  })

  it('is due well after the window too', () => {
    const now = new Date('2026-07-16T12:00:00.000Z')
    expect(nextEscalationTiming(stateAt(), now, 45)).toBe('due')
  })

  it('respects a custom escalation window', () => {
    const now = new Date('2026-07-16T09:20:00.000Z') // 20 min later
    expect(nextEscalationTiming(stateAt(), now, 15)).toBe('due')
    expect(nextEscalationTiming(stateAt(), now, 30)).toBe('none')
  })

  it('is none once acknowledged — hard stop regardless of elapsed time', () => {
    const now = new Date('2026-07-16T23:00:00.000Z')
    expect(nextEscalationTiming(stateAt({ state: 'acknowledged' }), now, 45)).toBe('none')
  })

  it('is none once dismissed — hard stop regardless of elapsed time', () => {
    const now = new Date('2026-07-16T23:00:00.000Z')
    expect(nextEscalationTiming(stateAt({ state: 'dismissed' }), now, 45)).toBe('none')
  })

  it('is none once already lapsed_for_day', () => {
    const now = new Date('2026-07-16T23:00:00.000Z')
    expect(nextEscalationTiming(stateAt({ state: 'lapsed_for_day' }), now, 45)).toBe('none')
  })

  describe('the hard cap — exactly one follow-up nudge maximum per entity per day', () => {
    it('is none once followUpSent is true, no matter how much time has passed', () => {
      const now = new Date('2026-07-16T23:59:00.000Z')
      expect(nextEscalationTiming(stateAt({ followUpSent: true }), now, 45)).toBe('none')
    })

    it('stays none even if state is still "sent" (would otherwise look due) once followUpSent is true', () => {
      // Guards against a bug where the cap check is skipped because state
      // wasn't also transitioned — followUpSent alone must be authoritative.
      const now = new Date('2026-07-17T09:00:00.000Z') // a full day later
      expect(nextEscalationTiming(stateAt({ state: 'sent', followUpSent: true }), now, 45)).toBe('none')
    })

    it('stays none for a snoozed state once followUpSent is true', () => {
      const now = new Date('2026-07-16T10:00:00.000Z')
      expect(
        nextEscalationTiming(
          stateAt({ state: 'snoozed', snoozeUntil: '2026-07-16T09:30:00.000Z', followUpSent: true }),
          now,
          45,
        ),
      ).toBe('none')
    })
  })

  describe('snooze reschedules the due time', () => {
    it('is none before snoozeUntil, even past the original escalation window', () => {
      const now = new Date('2026-07-16T09:50:00.000Z') // past the original 45-min window
      const state = stateAt({ state: 'snoozed', snoozeUntil: '2026-07-16T10:00:00.000Z' })
      expect(nextEscalationTiming(state, now, 45)).toBe('none')
    })

    it('is due once snoozeUntil arrives', () => {
      const now = new Date('2026-07-16T10:00:00.000Z')
      const state = stateAt({ state: 'snoozed', snoozeUntil: '2026-07-16T10:00:00.000Z' })
      expect(nextEscalationTiming(state, now, 45)).toBe('due')
    })
  })
})
