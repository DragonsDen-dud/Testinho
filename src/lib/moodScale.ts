import type { HabitLog } from '../db/types'

/**
 * STOA-5 Part B — the single face-valid 5-point mood item.
 *
 * Grounded in the EMA (Ecological Momentary Assessment) finding the brief
 * cites: one item, one scale, nothing else required. Compliance collapses
 * as items are added, so this deliberately stays a single row of five taps
 * and never grows a second question.
 *
 * IMPORTANT, and worth stating plainly: this scale is not new. A 5-point
 * mood row already existed on HabitCard, already wrote `HabitLog.mood`, and
 * already fed Article 35's mood correlation. The values (-2..+2) are
 * unchanged, so every mood already logged keeps its exact meaning and no
 * migration is involved. What this module adds is the *palette* (each point
 * now carries its own color from the upgraded PRESET family instead of the
 * whole row reading as gray emoji) and the prompting policy below.
 */
export interface MoodPoint {
  value: number
  emoji: string
  /** Hue for the selected state, drawn from the same vivid family as
   * PRESET_COLORS so the mood row reads as part of one color system rather
   * than a separate red-to-green ramp bolted on. */
  color: string
}

/**
 * A warm-to-cool progression rather than the conventional red→green
 * "bad→good" ramp: red/green scored ends read as pass/fail grading, which
 * is exactly the framing Article 6 rules out, and a low mood is not a
 * failure to be marked in red. Rose→amber→slate→teal→violet keeps five
 * genuinely distinguishable hues (including under deuteranopia, where a
 * red/green pair would collapse) while staying affectively neutral: no
 * point on this scale looks like a worse score than another, only a
 * different one.
 */
export const MOOD_SCALE: MoodPoint[] = [
  { value: -2, emoji: '😞', color: '#f43f5e' }, // rose
  { value: -1, emoji: '😕', color: '#f59e0b' }, // amber — matches PRESET index 4
  { value: 0, emoji: '😐', color: '#64748b' }, // slate — matches PRESET index 7
  { value: 1, emoji: '🙂', color: '#14b8a6' }, // teal — matches PRESET index 0
  { value: 2, emoji: '😊', color: '#8b5cf6' }, // violet — matches PRESET index 1
]

export function moodColor(value: number): string | undefined {
  return MOOD_SCALE.find((m) => m.value === value)?.color
}

/**
 * How many consecutive recent check-ins may go without a mood before the
 * row stops presenting itself. Four is roughly "most of a week" for a daily
 * habit — long enough not to react to a single busy day, short enough that
 * a habit Denys genuinely doesn't want to rate stops asking quickly.
 */
export const MOOD_PROMPT_IGNORE_THRESHOLD = 4

/**
 * The brief's "if he ignores it repeatedly for a given habit, don't nag —
 * reduce or stop prompting for that habit rather than escalating."
 *
 * Derived from the log history rather than stored as per-habit state, on
 * purpose: it needs no schema field, no migration, and no write on every
 * dismissal, and it self-corrects. The moment a mood is logged again the
 * count resets and the row returns — there is no sticky "you turned this
 * off" state to get stuck in.
 *
 * Note this is genuinely *reduce*, not *remove*: the caller collapses the
 * row to a single small "add mood" affordance rather than deleting it, so
 * rating a day is always still one tap away. Nothing about this ever
 * touches the completion action itself.
 */
export function shouldPromptMood(logs: HabitLog[], asOfDate: string): boolean {
  const recent = logs
    .filter((l) => l.date <= asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MOOD_PROMPT_IGNORE_THRESHOLD)

  // Not enough history to conclude anything — keep prompting.
  if (recent.length < MOOD_PROMPT_IGNORE_THRESHOLD) return true
  return recent.some((l) => l.mood != null)
}
