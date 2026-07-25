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
export const HERO_VALUE_CLASSES = 'text-2xl font-semibold tabular-nums tracking-tight leading-none'

export function HeroValue({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${HERO_VALUE_CLASSES} ${className}`}>{children}</span>
}
