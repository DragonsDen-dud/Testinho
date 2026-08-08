import type { ReactNode } from 'react'

/**
 * Typography convention, not a data-bound component — Part 2/3 can drop
 * this in wherever a screen needs "the one big number" treatment (a
 * streak count, a progress percent, a totals figure) without re-deriving
 * the size/weight/tabular-nums combination each time.
 *
 * Usage: `<HeroValue>{streakCount}</HeroValue>` or, for a raw string
 * needing the same look outside a component tree, `className={HERO_VALUE_CLASSES}`
 * directly on any element.
 */
// STOA-7 — the one big number now takes the display face (Unbounded 900).
// `font-display` carries its own weight and letter-spacing, so the previous
// font-semibold/tracking-tight pair is dropped rather than fighting it.
export const HERO_VALUE_CLASSES = 'font-display text-2xl tabular-nums leading-none'

export function HeroValue({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${HERO_VALUE_CLASSES} ${className}`}>{children}</span>
}
