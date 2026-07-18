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
