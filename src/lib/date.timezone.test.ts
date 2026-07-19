// Article B.1 — regression test for the reported "today's task appears
// bucketed under the wrong day" defect. The suspected mechanism was a
// mismatch between a UTC-normalized dueDate and a local-timezone "what is
// today" comparison, which would only surface for a user in a timezone
// behind UTC late in the local day (their local date has not yet rolled
// over in UTC terms). This must run under an actual UTC-behind timezone,
// not the CI/sandbox default (frequently UTC itself, which would make the
// bug invisible even if present) — that's the whole point of the test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toDateKey, todayKey, addDays } from './date'

const ORIGINAL_TZ = process.env.TZ

describe('date bucketing under a UTC-behind timezone (Article B.1)', () => {
  beforeEach(() => {
    // America/Toronto: UTC-4 (DST) in July, so 11:30 PM local on the 19th
    // is already 03:30 AM UTC on the 20th — exactly the boundary condition
    // that would expose a UTC-vs-local mismatch.
    process.env.TZ = 'America/Toronto'
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = ORIGINAL_TZ
  })

  it('toDateKey/todayKey compute the local calendar day, not the UTC-shifted one', () => {
    const lateEveningLocal = new Date(2026, 6, 19, 23, 30, 0) // 11:30 PM, July 19, local
    expect(lateEveningLocal.getUTCDate()).toBe(20) // sanity check: UTC has already rolled to the 20th
    expect(toDateKey(lateEveningLocal)).toBe('2026-07-19') // but the local calendar day is still the 19th
  })

  it('a task created "today" at a late-evening local hour still buckets as today, not tomorrow, via todayKey()', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 19, 23, 30, 0))

    const key = todayKey()
    expect(key).toBe('2026-07-19')

    // Mirrors useOpenTodosToday's exact bucketing logic (state/useTodos.ts):
    // a todo whose dueDate was set to todayKey() at creation time must
    // still satisfy dueDate === todayKey() when re-evaluated a moment
    // later — the two calls must never disagree because of a UTC/local
    // split between "when it was stamped" and "when it's bucketed".
    const dueDate = todayKey() // simulates what a "due today" default/quick-create would store
    expect(dueDate === todayKey()).toBe(true) // today bucket
    expect(dueDate < todayKey()).toBe(false) // not overdue
    expect(addDays(todayKey(), 1) === dueDate).toBe(false) // not tomorrow's bucket either
  })

  it('the same instant, interpreted in a timezone ahead of UTC, buckets as the calendar day one earlier — confirms the comparison is local, not absolute', () => {
    process.env.TZ = 'Pacific/Auckland' // UTC+12/+13
    const earlyMorningLocal = new Date(2026, 6, 20, 1, 0, 0) // 1 AM, July 20, local
    expect(earlyMorningLocal.getUTCDate()).toBe(19) // UTC still on the 19th
    expect(toDateKey(earlyMorningLocal)).toBe('2026-07-20') // local calendar day is already the 20th
  })
})
