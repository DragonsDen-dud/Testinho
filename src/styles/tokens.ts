// JS-side companions to src/styles/tokens.css (v5 — Tesla + SpaceX + iOS
// dot fusion).

export const MOTION = {
  dotFill: { durationMs: 200, curve: 'var(--ease-dot-fill)' },
} as const

// PriorityLevel (src/db/types.ts) still has no `color` field — same
// discrepancy flagged in the prior two rounds. "Color only for function"
// collapses to three tiers: only the top priority gets the alert color,
// the next gets the info color, everything else is neutral — a status
// light doesn't need a shade per priority level, just alert/info/none.
export type PriorityDotTone = 'alert' | 'info' | 'neutral'

export function priorityDotTone(sortOrder: number): PriorityDotTone {
  if (sortOrder <= 0) return 'alert'
  if (sortOrder === 1) return 'info'
  return 'neutral'
}
