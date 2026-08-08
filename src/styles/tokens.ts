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

// Category-color contrast: LifeDomain.color / Project.color are arbitrary
// user-picked hex values (Article 3 — this reads existing user data, it
// doesn't invent a new hardcoded palette), so the card can't assume the
// text color that goes on top. Standard WCAG relative-luminance formula.
function srgbChannel(c: number): number {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

// 0.179 is where pure-black and pure-white text reach equal contrast
// against a background of that luminance (solving (L+0.05)/0.05 =
// 1.05/(L+0.05)) — both sides of the split clear 4.5:1 with margin, so
// there's no luminance value this can pick wrong for. Pure #000/#fff
// (not the app's softer off-black/off-white ink tokens) specifically
// because a slightly gentler pair leaves a real gap in the middle of the
// luminance range where neither choice reaches 4.5:1 — verified, not
// assumed, when this was worked out.
const TEXT_SPLIT_LUMINANCE = 0.179

export function accessibleTextColor(backgroundHex: string): '#000000' | '#ffffff' {
  return relativeLuminance(backgroundHex) > TEXT_SPLIT_LUMINANCE ? '#000000' : '#ffffff'
}

export function accessibleRingColor(backgroundHex: string): string {
  return relativeLuminance(backgroundHex) > TEXT_SPLIT_LUMINANCE ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.38)'
}

// ── STOA-7 Part C: the gradient badge fill ──────────────────────────────

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function toHex(n: number): string {
  return Math.round(clamp01(n / 255) * 255)
    .toString(16)
    .padStart(2, '0')
}

/**
 * Shifts a colour toward white (positive amount) or black (negative),
 * proportionally. Deliberately a simple sRGB mix rather than an HSL
 * lightness change: HSL would also swing saturation at the extremes, which
 * is how a "lighter blue" ends up looking like a different, chalkier hue.
 */
export function shadeColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const target = amount >= 0 ? 255 : 0
  const t = Math.abs(amount)
  return `#${toHex(r + (target - r) * t)}${toHex(g + (target - g) * t)}${toHex(b + (target - b) * t)}`
}

/**
 * The badge's gradient fill, derived entirely from one category colour.
 *
 * Introduces no new palette entry: both stops are the colour itself, one of
 * them shifted in lightness, so a category still reads as exactly its own
 * hue — just with dimension instead of a flat disc.
 *
 * DIRECTIONAL, NOT SYMMETRIC — and that is the whole correctness argument.
 * `accessibleTextColor` picks the badge's black-or-white icon once, from the
 * source colour, and that single choice has to stay correct across every
 * pixel of the sweep. A symmetric light/dark gradient cannot guarantee that:
 * three colours in the shipped palette (#64748b, #6366f1, #8b5cf6) sit
 * within 0.02 relative luminance of the black/white split, so *any*
 * symmetric range — even 6% — pushes one end across it and leaves the icon
 * under-contrasted on part of the badge. That was caught by this file's own
 * test on the first run, not by eye.
 *
 * So the gradient only ever shades AWAY from the icon colour:
 *   - a light badge (black icon) runs from lighter → the source
 *   - a dark badge (white icon) runs from the source → darker
 * Moving away from the split can never cross it, and every stop therefore
 * has at least the contrast the source colour already guarantees. The
 * property holds for any range, which is what makes it a guarantee rather
 * than a tuned value; 22% is chosen purely for how much dimension reads
 * well at badge size. Both cases keep the light source in the same place
 * (brighter top-left, darker bottom-right), so badges of different colours
 * still look lit from one direction.
 */
export const BADGE_GRADIENT_RANGE = 0.22

export function gradientFromColor(hex: string): string {
  const iconIsBlack = accessibleTextColor(hex) === '#000000'
  return iconIsBlack
    ? `linear-gradient(145deg, ${shadeColor(hex, BADGE_GRADIENT_RANGE)} 0%, ${hex} 100%)`
    : `linear-gradient(145deg, ${hex} 0%, ${shadeColor(hex, -BADGE_GRADIENT_RANGE)} 100%)`
}
