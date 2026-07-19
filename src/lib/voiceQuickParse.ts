// Part 2, Option A — local heuristic parsing. A small, deterministic
// pattern set (regex-based date/time phrases, substring domain matching,
// keyword detection), not a general NLP engine — free, instant, fully
// offline, no API cost, no additional privacy exposure. See the round's
// report for why this was chosen over sending the transcript to the AI
// proxy (Option B): running a real API call on every quick-add would make
// voice quick-create the single most frequent AI-triggering action in the
// app, which isn't a cost tradeoff to make silently.

import type { LifeDomain } from '../db/types'
import { toDateKey, addDays, weekdayOf } from './date'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const CALENDAR_INTENT_RE = /\b(calendar|remind me|reminder)\b/i

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

interface DayMatch {
  dueDate: string
  matchedText: string
}

// `now` threads through explicitly rather than this reading the live clock
// itself (todayKey()) — otherwise every "tomorrow"/"next Tuesday" test
// would be flaky depending on the day it happened to run, the same reason
// tickReminders takes an injectable `now` elsewhere in this codebase.
function matchDay(lower: string, now: Date): DayMatch | undefined {
  const today = toDateKey(now)
  if (/\btoday\b/.test(lower)) return { dueDate: today, matchedText: 'today' }
  if (/\btomorrow\b/.test(lower)) return { dueDate: addDays(today, 1), matchedText: 'tomorrow' }

  const inDays = lower.match(/\bin (\d+) days?\b/)
  if (inDays) return { dueDate: addDays(today, Number(inDays[1])), matchedText: inDays[0] }

  const nextWeekday = lower.match(/\bnext (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (nextWeekday) {
    const targetDow = WEEKDAYS.indexOf(nextWeekday[1])
    const currentDow = weekdayOf(today)
    // "next X" always means a future occurrence, never today, even if
    // today happens to be X — otherwise "next Tuesday" said on a Tuesday
    // would silently mean "today", which isn't what anyone means by "next".
    const delta = (targetDow - currentDow + 7) % 7 || 7
    return { dueDate: addDays(today, delta), matchedText: nextWeekday[0] }
  }

  const bareWeekday = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (bareWeekday) {
    const targetDow = WEEKDAYS.indexOf(bareWeekday[1])
    const currentDow = weekdayOf(today)
    const delta = (targetDow - currentDow + 7) % 7 // includes today, unlike "next X"
    return { dueDate: addDays(today, delta), matchedText: bareWeekday[0] }
  }

  return undefined
}

interface TimeMatch {
  scheduledTime: string
  matchedText: string
  rollsToTomorrow: boolean
}

function matchTime(lower: string, now: Date): TimeMatch | undefined {
  const inHours = lower.match(/\bin (an|a|\d+) hours?\b/)
  if (inHours) {
    const n = inHours[1] === 'an' || inHours[1] === 'a' ? 1 : Number(inHours[1])
    const t = new Date(now.getTime() + n * 3600000)
    return { scheduledTime: `${pad(t.getHours())}:${pad(t.getMinutes())}`, matchedText: inHours[0], rollsToTomorrow: t.getDate() !== now.getDate() }
  }
  const inMinutes = lower.match(/\bin (\d+) minutes?\b/)
  if (inMinutes) {
    const n = Number(inMinutes[1])
    const t = new Date(now.getTime() + n * 60000)
    return { scheduledTime: `${pad(t.getHours())}:${pad(t.getMinutes())}`, matchedText: inMinutes[0], rollsToTomorrow: t.getDate() !== now.getDate() }
  }

  // Absolute clock time — only accepted when unambiguous: either am/pm is
  // explicit, or the hour is already >=13 (unmistakably 24h). A bare "at
  // 5" is genuinely ambiguous (5am? 5pm?) and deliberately left unmatched
  // rather than guessed — it falls through to the "When?" prompt instead,
  // consistent with "explicitly prompt for whatever it couldn't
  // confidently extract" rather than silently picking one.
  const timeRe = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi
  for (const m of lower.matchAll(timeRe)) {
    const hour = Number(m[1])
    const minute = m[2] ? Number(m[2]) : 0
    const meridiem = m[3]?.toLowerCase()
    if (hour > 23 || minute > 59) continue
    if (!meridiem && hour < 13) continue // ambiguous, skip
    let hour24 = hour
    if (meridiem === 'am') hour24 = hour === 12 ? 0 : hour
    if (meridiem === 'pm') hour24 = hour === 12 ? 12 : hour + 12
    return { scheduledTime: `${pad(hour24)}:${pad(minute)}`, matchedText: m[0].trim(), rollsToTomorrow: false }
  }
  return undefined
}

/** Never invents a category — only matches against the user's own real
 * LifeDomains (Article 3). Longest name first so a more specific domain
 * name wins over a shorter one that happens to be a substring of it. */
export function matchDomain(text: string, domains: LifeDomain[]): LifeDomain | undefined {
  const lower = text.toLowerCase()
  const byLength = [...domains].sort((a, b) => b.name.length - a.name.length)
  return byLength.find((d) => d.name.trim() && lower.includes(d.name.toLowerCase()))
}

export function detectCalendarIntent(text: string): boolean {
  return CALENDAR_INTENT_RE.test(text)
}

export interface VoiceParseResult {
  title: string
  dueDate?: string
  scheduledTime?: string
  domain?: LifeDomain
  calendarIntent: boolean
}

/**
 * Strips whatever was recognized as structured (the date/time phrase, the
 * matched domain name, the calendar-intent keywords) out of the transcript
 * so the title left behind is the actual task/habit name, not the whole
 * spoken sentence restated. Best-effort cleanup, not a grammar engine —
 * leftover connector words ("on", "at") are an accepted rough edge.
 */
function stripMatchedPhrases(original: string, cuts: string[]): string {
  let result = original
  for (const cut of cuts) {
    if (!cut) continue
    result = result.replace(new RegExp(cut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ')
  }
  return result.replace(/\s+/g, ' ').trim().replace(/^[,.\s]+|[,.\s]+$/g, '')
}

/**
 * Habits have no due-date concept (they recur) — only the time-of-day
 * portion of a spoken phrase maps onto anything real for them
 * (reminderTimes). Todos have both dueDate and scheduledTime, so the full
 * day+time phrase applies. Callers pick the right shape for their entity
 * type rather than this function guessing.
 */
export function parseVoiceQuickCreate(transcript: string, domains: LifeDomain[], now: Date = new Date()): VoiceParseResult {
  const lower = transcript.toLowerCase()
  const today = toDateKey(now)
  const day = matchDay(lower, now)
  const time = matchTime(lower, now)
  const domain = matchDomain(transcript, domains)
  const calendarIntent = detectCalendarIntent(transcript)

  const dueDate = day?.dueDate ?? (time ? (time.rollsToTomorrow ? addDays(today, 1) : today) : undefined)

  const cuts = [day?.matchedText, time?.matchedText, domain?.name, 'calendar', 'remind me', 'reminder']
  const title = stripMatchedPhrases(transcript, cuts.filter((c): c is string => !!c))

  return {
    title: title || transcript.trim(),
    dueDate,
    scheduledTime: time?.scheduledTime,
    domain,
    calendarIntent,
  }
}
