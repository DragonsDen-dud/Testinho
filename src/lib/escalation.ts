import type { ReminderStateValue } from '../db/types'

export type EscalationTiming = 'none' | 'due'

/**
 * Article 40 — pure escalation *timing* decision only; quiet hours are a
 * separate concern the caller composes in afterward (see
 * lib/quietHours.ts). 'acknowledged', 'dismissed', and 'lapsed_for_day' are
 * all terminal — nothing more ever happens automatically once reached.
 * `followUpSent` is the hard cap: once true, this always returns 'none',
 * regardless of how much more time passes or how many times it's checked —
 * there is exactly one follow-up nudge per entity per day, ever.
 */
export function nextEscalationTiming(
  state: { state: ReminderStateValue; sentAt: string; followUpSent: boolean; snoozeUntil?: string },
  now: Date,
  escalationWindowMinutes: number = 45,
): EscalationTiming {
  if (state.state !== 'sent' && state.state !== 'snoozed') return 'none'
  if (state.followUpSent) return 'none'

  const dueAt =
    state.state === 'snoozed' && state.snoozeUntil
      ? new Date(state.snoozeUntil)
      : new Date(new Date(state.sentAt).getTime() + escalationWindowMinutes * 60000)

  return now >= dueAt ? 'due' : 'none'
}
