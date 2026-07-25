import * as LucideIcons from 'lucide-react'
import { Folder, type LucideIcon } from 'lucide-react'
import { accessibleTextColor } from '../../styles/tokens'

const SIZE_PX = { row: 34, detail: 52 } as const

/**
 * Solid color fill + a black-or-white icon chosen by accessibleTextColor
 * (styles/tokens.ts), reused rather than re-derived here. This is the only
 * approach that's provably correct for arbitrary hex values (user-picked
 * or hash-generated) without per-color testing: a tinted/soft background
 * with a full-saturation icon on top (the alternative — and what
 * DomainsPage's own chip already does for its emoji icon, where contrast
 * doesn't apply the same way) can't be guaranteed to clear any fixed
 * threshold for every possible hue/lightness, whereas
 * accessibleTextColor's black/white split was specifically verified
 * (see its own comment) to clear 4.5:1 on both sides for any background.
 *
 * An icon glyph is a graphical UI object, not text, so the applicable spec
 * is WCAG 1.4.11 Non-text Contrast (3:1 minimum), not 1.4.3's text
 * thresholds — but since accessibleTextColor already guarantees ≥4.5:1,
 * this clears 1.4.11's 3:1 with margin regardless of which is deemed to
 * apply.
 */
export function ColorIconBadge({
  color,
  icon,
  size = 'row',
}: {
  color: string
  icon: string
  size?: 'row' | 'detail'
}) {
  const px = SIZE_PX[size]
  const Icon: LucideIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[icon] ?? Folder
  const iconColor = accessibleTextColor(color)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: px, height: px, background: color }}
    >
      <Icon size={Math.round(px * 0.52)} color={iconColor} strokeWidth={2} aria-hidden />
    </span>
  )
}
