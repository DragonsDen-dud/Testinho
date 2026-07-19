import { describe, expect, it } from 'vitest'
import { parseVoiceQuickCreate, matchDomain, detectCalendarIntent } from './voiceQuickParse'
import type { LifeDomain } from '../db/types'

// 2026-07-16 is a Thursday (established elsewhere in this codebase's
// tests, e.g. reminders.test.ts) — 2026-07-19 (this round's "today") is a
// Sunday. Tests use a fixed `now` throughout so results don't depend on
// the day they happen to run.
const THURSDAY = new Date(2026, 6, 16, 10, 0) // Thu 10:00

function domain(name: string): LifeDomain {
  return { id: name, spaceId: 'space-1', name, color: '#000', icon: '🏠', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' }
}

describe('parseVoiceQuickCreate — date/time phrases', () => {
  it('parses "today"', () => {
    expect(parseVoiceQuickCreate('Water the plants today', [], THURSDAY).dueDate).toBe('2026-07-16')
  })

  it('parses "tomorrow"', () => {
    expect(parseVoiceQuickCreate('Call the dentist tomorrow', [], THURSDAY).dueDate).toBe('2026-07-17')
  })

  it('parses "in 3 days"', () => {
    expect(parseVoiceQuickCreate('Pay rent in 3 days', [], THURSDAY).dueDate).toBe('2026-07-19')
  })

  it('parses "next Tuesday" as the *following* Tuesday, not today even if today is Tuesday', () => {
    const tuesday = new Date(2026, 6, 21, 10, 0) // Tue
    expect(parseVoiceQuickCreate('Dentist next tuesday', [], tuesday).dueDate).toBe('2026-07-28')
  })

  it('parses a bare weekday as the nearest upcoming occurrence, including today', () => {
    expect(parseVoiceQuickCreate('Team sync thursday', [], THURSDAY).dueDate).toBe('2026-07-16')
    expect(parseVoiceQuickCreate('Team sync friday', [], THURSDAY).dueDate).toBe('2026-07-17')
  })

  it('parses "tomorrow at 5pm" — both day and time from one phrase', () => {
    const result = parseVoiceQuickCreate('Pick up the car tomorrow at 5pm', [], THURSDAY)
    expect(result.dueDate).toBe('2026-07-17')
    expect(result.scheduledTime).toBe('17:00')
  })

  it('parses "in an hour" relative to now, rolling to tomorrow if it crosses midnight', () => {
    const lateNight = new Date(2026, 6, 16, 23, 30)
    const result = parseVoiceQuickCreate('Take the bread out in an hour', [], lateNight)
    expect(result.scheduledTime).toBe('00:30')
    expect(result.dueDate).toBe('2026-07-17')
  })

  it('parses "in 20 minutes"', () => {
    const result = parseVoiceQuickCreate('Check the oven in 20 minutes', [], THURSDAY)
    expect(result.scheduledTime).toBe('10:20')
    expect(result.dueDate).toBe('2026-07-16')
  })

  it('does NOT guess an ambiguous bare hour with no am/pm', () => {
    const result = parseVoiceQuickCreate('Meet Sam at 5', [], THURSDAY)
    expect(result.scheduledTime).toBeUndefined()
  })

  it('accepts an unambiguous 24h-style hour with no am/pm', () => {
    const result = parseVoiceQuickCreate('Meet Sam at 17', [], THURSDAY)
    expect(result.scheduledTime).toBe('17:00')
  })

  it('converts 12am/12pm correctly', () => {
    expect(parseVoiceQuickCreate('Call at 12am', [], THURSDAY).scheduledTime).toBe('00:00')
    expect(parseVoiceQuickCreate('Call at 12pm', [], THURSDAY).scheduledTime).toBe('12:00')
  })

  it('finds nothing when there is no date/time phrase at all', () => {
    const result = parseVoiceQuickCreate('Buy groceries', [], THURSDAY)
    expect(result.dueDate).toBeUndefined()
    expect(result.scheduledTime).toBeUndefined()
  })
})

describe('matchDomain — never invents a category', () => {
  const domains = [domain('Health'), domain('Work'), domain('Home')]

  it('matches a domain name that appears in the transcript', () => {
    expect(matchDomain('Book a Health checkup', domains)?.name).toBe('Health')
  })

  it('is case-insensitive', () => {
    expect(matchDomain('finish the WORK report', domains)?.name).toBe('Work')
  })

  it('returns undefined when no real domain name appears — never invents one', () => {
    expect(matchDomain('Buy groceries for the trip', domains)).toBeUndefined()
  })

  it('returns undefined when the user has no domains at all', () => {
    expect(matchDomain('Health checkup', [])).toBeUndefined()
  })
})

describe('detectCalendarIntent', () => {
  it('detects "calendar"', () => {
    expect(detectCalendarIntent('Add this to my calendar')).toBe(true)
  })

  it('detects "remind me"', () => {
    expect(detectCalendarIntent('Remind me to call mom')).toBe(true)
  })

  it('detects "reminder"', () => {
    expect(detectCalendarIntent('Set a reminder for this')).toBe(true)
  })

  it('is false for a plain phrase with no calendar intent', () => {
    expect(detectCalendarIntent('Buy groceries tomorrow')).toBe(false)
  })
})

describe('parseVoiceQuickCreate — title cleanup', () => {
  it('strips the matched date/time phrase and domain out of the title', () => {
    const domains = [domain('Health')]
    const result = parseVoiceQuickCreate('Health checkup tomorrow at 5pm', domains, THURSDAY)
    expect(result.title.toLowerCase()).not.toContain('tomorrow')
    expect(result.title.toLowerCase()).not.toContain('5pm')
    expect(result.title.toLowerCase()).toContain('checkup')
  })

  it('falls back to the full transcript if stripping would leave nothing', () => {
    const result = parseVoiceQuickCreate('tomorrow', [], THURSDAY)
    expect(result.title).toBe('tomorrow')
  })

  it('title is unchanged when nothing was matched', () => {
    const result = parseVoiceQuickCreate('Buy groceries', [], THURSDAY)
    expect(result.title).toBe('Buy groceries')
  })
})
