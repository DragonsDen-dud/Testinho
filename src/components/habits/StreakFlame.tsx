import { Flame, Sprout, Trophy } from 'lucide-react'
import { streakTier, isStreakAlive, type StreakTier } from '../../lib/streakVisual'

// Icon SHAPE escalates across tiers (sprout -> flame -> trophy) and SIZE
// grows progressively — the "tiered visual escalation" axis. Warm-vs-muted
// color stays a single binary applied uniformly across every tier (see
// `color` below), matching the brief's own two-axis framing.
const SIZE_BY_TIER: Record<StreakTier, number> = {
  sprout: 14,
  flameSmall: 14,
  flameMedium: 16,
  flameGlow: 18,
  milestone: 20,
}

/**
 * The "hero streak object" (Section 1) — a single icon+number pairing
 * replacing the plain "X% strength / Y days" text in the collapsed
 * "Done today" row only. Chose lucide-react vector icons over raw emoji
 * for the same reason as the Part A nav-icon-consistency pass: consistent
 * stroke width and optical size, theme-aware via currentColor, not
 * platform-dependent rendering.
 */
export function StreakFlame({ days, milestoneAnimate = false }: { days: number; milestoneAnimate?: boolean }) {
  const tier = streakTier(days)
  const alive = isStreakAlive(days)
  const size = SIZE_BY_TIER[tier]
  const color = alive ? 'var(--stoa-streak-warm)' : 'var(--stoa-text-muted)'
  const glow = tier === 'flameGlow' || tier === 'milestone'
  const Icon = tier === 'sprout' ? Sprout : tier === 'milestone' ? Trophy : Flame

  return (
    <span className={`inline-flex items-center gap-1 ${milestoneAnimate ? 'streak-glow-pulse' : ''}`} style={{ color }}>
      <Icon
        size={size}
        strokeWidth={1.75}
        fill={tier !== 'sprout' && alive ? color : 'none'}
        aria-hidden
        style={glow && alive ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
      />
      <span className="text-sm font-semibold">{days}</span>
    </span>
  )
}
