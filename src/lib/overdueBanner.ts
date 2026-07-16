/**
 * Article 30 — the overdue banner is a once-per-calendar-day nag, not a
 * once-per-session one. Comparing calendar date strings (not a boolean
 * session flag) is what makes reopening the app twice in the same day not
 * re-show it, while reopening it tomorrow does.
 */
export function shouldShowOverdueBanner(lastShownDate: string | undefined, today: string): boolean {
  return lastShownDate !== today
}
