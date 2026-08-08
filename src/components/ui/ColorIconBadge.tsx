import * as LucideIcons from 'lucide-react'
import { Folder, type LucideIcon } from 'lucide-react'
import { accessibleTextColor, gradientFromColor } from '../../styles/tokens'

// 'tray' (Habits 2.0 Part B) — the "done today" tray's completed-habit
// bubbles: sized up from row (list density) but below detail (a
// dedicated full-screen preview), landing at a home-screen-app-icon-like
// size that still fits several per row in a flex-wrap tray.
const SIZE_PX = { row: 34, tray: 44, detail: 52 } as const

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
/**
 * Small monochrome glyph layered on the badge's corner — deliberately
 * independent of the category color (own canvas-colored background +
 * hairline ring, own icon color) so it stays legible against any badge
 * color and never doubles as a second "meaning" for that color. Added for
 * the Habits round (build-vs-avoid needs its own persistent icon signal,
 * not color/label alone — see styles/tokens.ts's own "color only for
 * function" precedent) as an optional, backward-compatible extension:
 * omit it and this component renders exactly as it did in Part 1.
 */
export interface ColorIconBadgeIndicator {
  icon: LucideIcon
  label: string
}

export function ColorIconBadge({
  color,
  icon,
  size = 'row',
  indicator,
}: {
  color: string
  icon: string
  size?: 'row' | 'tray' | 'detail'
  indicator?: ColorIconBadgeIndicator
}) {
  const px = SIZE_PX[size]
  const Icon: LucideIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[icon] ?? Folder
  const iconColor = accessibleTextColor(color)
  const indicatorPx = Math.round(px * 0.44)
  const iconPx = Math.round(px * 0.52)
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: px,
        height: px,
        // STOA-7 Part C (low-effort tier) — the flat fill becomes a
        // gradient derived from this category's own colour. Every badge in
        // the app goes through this one component, so the whole surface
        // upgrades at once with no icon set to maintain and no per-call-site
        // change. `accessibleTextColor` still reads the ORIGINAL colour, not
        // the gradient: the gradient only varies lightness around that hue,
        // so the black/white split it computes stays correct across the
        // whole sweep (see gradientFromColor's own note).
        backgroundImage: gradientFromColor(color),
        // Retained as a flat fallback for any renderer that drops
        // background-image — the badge is a solid shape either way.
        backgroundColor: color,
      }}
    >
      {/* Duotone: a soft, larger backing glyph at low opacity behind the
          solid one. Same icon, offset and scaled up slightly, which reads
          as depth rather than as a second symbol — and costs nothing,
          since it's the same component already imported. */}
      <Icon
        size={Math.round(iconPx * 1.5)}
        color={iconColor}
        strokeWidth={1.5}
        aria-hidden
        style={{ position: 'absolute', opacity: 0.18, transform: 'translate(14%, 14%)' }}
      />
      <Icon size={iconPx} color={iconColor} strokeWidth={2} aria-hidden style={{ position: 'relative' }} />
      {indicator && (
        <span
          aria-label={indicator.label}
          className="absolute inline-flex items-center justify-center rounded-full"
          style={{
            width: indicatorPx,
            height: indicatorPx,
            right: -2,
            bottom: -2,
            background: 'var(--stoa-bg)',
            border: '1.5px solid var(--stoa-border)',
          }}
        >
          <indicator.icon size={Math.round(indicatorPx * 0.62)} color="var(--stoa-text)" strokeWidth={2.25} aria-hidden />
        </span>
      )}
    </span>
  )
}
