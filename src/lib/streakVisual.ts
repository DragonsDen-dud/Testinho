/**
 * Article 6/14 — a pure presentation-layer lookup over the *existing*
 * streak/strength number (computeBuildStreak/computeAvoidStreak in
 * habitStrength.ts). No new stored field: the tier is re-derived every
 * render from data that already exists, so a broken streak simply
 * re-derives to the lowest tier on its own — there is nothing to "reset"
 * or "lose" as a separate concept, and nothing to persist.
 */
export type StreakTier = 'sprout' | 'flameSmall' | 'flameMedium' | 'flameGlow' | 'milestone'

const TIER_THRESHOLDS: { min: number; tier: StreakTier }[] = [
  { min: 30, tier: 'milestone' },
  { min: 14, tier: 'flameGlow' },
  { min: 7, tier: 'flameMedium' },
  { min: 3, tier: 'flameSmall' },
  { min: 0, tier: 'sprout' },
]

export function streakTier(days: number): StreakTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (days >= min) return tier
  }
  return 'sprout'
}

/** "Alive" (warm) vs "broken" (muted) — Duolingo's color logic, driven
 * purely by whether the streak is currently non-zero. */
export function isStreakAlive(days: number): boolean {
  return days >= 1
}

/**
 * True the instant `currentDays` lands in a strictly higher tier than
 * `previousDays` was in. Used to gate the one-time milestone animation —
 * the caller is responsible for only checking this once per completion
 * action (see CompletedHabitBubble), not on every render, so a habit that's
 * already sitting in a tier from a prior day never replays it.
 */
export function justCrossedTier(previousDays: number, currentDays: number): boolean {
  if (currentDays <= previousDays) return false
  return streakTier(currentDays) !== streakTier(previousDays)
}
