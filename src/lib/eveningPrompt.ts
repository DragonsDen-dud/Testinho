/**
 * STOA-6 — when Today starts offering to plan tomorrow.
 *
 * Lives here rather than beside the card component so the component file
 * exports only a component (React Fast Refresh needs that, and the linter
 * enforces it), and so this is testable without rendering anything.
 */

/** From this hour, local time. 17:00 is early enough to catch an evening
 * that starts before dinner, late enough that the prompt isn't sitting
 * there all morning competing with the day's actual habits. */
export const EVENING_PROMPT_FROM_HOUR = 17

export function isEveningPromptTime(now: Date = new Date()): boolean {
  return now.getHours() >= EVENING_PROMPT_FROM_HOUR
}
