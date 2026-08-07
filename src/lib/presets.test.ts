import { describe, expect, it } from 'vitest'
import { PRESET_COLORS, PRESET_ICONS } from './presets'

const ORIGINAL_ICONS = ['🏠', '💼', '🎯', '🌱', '⚡', '📚', '❤️', '🧘', '💰', '🎨']

describe('PRESET_ICONS (Space icon picker)', () => {
  it('keeps every original icon in its original order — a Space picked by index must keep meaning the same icon', () => {
    expect(PRESET_ICONS.slice(0, ORIGINAL_ICONS.length)).toEqual(ORIGINAL_ICONS)
  })

  it('adds exactly 5 new icons, all distinct from the original set', () => {
    const added = PRESET_ICONS.slice(ORIGINAL_ICONS.length)
    expect(added).toHaveLength(5)
    for (const icon of added) expect(ORIGINAL_ICONS).not.toContain(icon)
  })

  it('has no duplicate entries at all', () => {
    expect(new Set(PRESET_ICONS).size).toBe(PRESET_ICONS.length)
  })
})

/**
 * The pre-STOA-5 values, kept as a reference point rather than as the
 * expected output. STOA-5's "colorful minimalism" round raised every value
 * in place from a 600 weight to a 500 one; what must stay stable is not the
 * exact hex but the *hue at each index* — a category whose color comes from
 * the deterministic hash may get a more vivid shade, but must never jump to
 * a different color. That is what these tests now enforce.
 */
const PRE_STOA5_COLORS = [
  '#0d9488',
  '#7c3aed',
  '#dc2626',
  '#2563eb',
  '#d97706',
  '#059669',
  '#db2777',
  '#64748b',
  '#4f46e5',
  '#ea580c',
  '#0891b2',
  '#c026d3',
]

/** Hue angle in degrees, 0-360. */
function hueOf(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  return (h * 60 + 360) % 360
}

function hueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b)
  return Math.min(raw, 360 - raw)
}

function relativeLuminanceOf(hex: string): number {
  const clean = hex.replace('#', '')
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const r = channel(parseInt(clean.slice(0, 2), 16))
  const g = channel(parseInt(clean.slice(2, 4), 16))
  const b = channel(parseInt(clean.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('PRESET_COLORS (Space/LifeDomain/Project color picker)', () => {
  it('never changes length — an index that resolved to a color must keep resolving', () => {
    expect(PRESET_COLORS).toHaveLength(PRE_STOA5_COLORS.length)
  })

  it('keeps every index in its original hue family — a teal category never becomes a pink one', () => {
    PRE_STOA5_COLORS.forEach((original, i) => {
      const originalHue = hueOf(original)
      const currentHue = hueOf(PRESET_COLORS[i])
      // 25° is comfortably inside one named hue family (the palette's own
      // neighbours sit 30°+ apart) while allowing the weight shift.
      expect(hueDistance(originalHue, currentHue)).toBeLessThan(25)
    })
  })

  it('is more luminous than the set it replaced, except for the deliberate neutral at index 7', () => {
    PRE_STOA5_COLORS.forEach((original, i) => {
      if (i === 7) {
        expect(PRESET_COLORS[i]).toBe(original) // slate stays put on purpose
        return
      }
      expect(relativeLuminanceOf(PRESET_COLORS[i])).toBeGreaterThan(relativeLuminanceOf(original))
    })
  })

  it('has no duplicate entries at all', () => {
    expect(new Set(PRESET_COLORS).size).toBe(PRESET_COLORS.length)
  })

  it('keeps every color legible on both the light and dark canvas', () => {
    // Not a WCAG text check — these are badge fills, and the icon drawn on
    // top is handled separately by accessibleTextColor. This guards the
    // narrower failure the round actually risks: a color so close to a
    // canvas that the badge stops reading as a distinct shape at all.
    const LIGHT_BG = 0.95 // #fafaf9
    const DARK_BG = 0.008 // #16151a
    for (const color of PRESET_COLORS) {
      const lum = relativeLuminanceOf(color)
      expect(Math.abs(lum - LIGHT_BG)).toBeGreaterThan(0.15)
      expect(Math.abs(lum - DARK_BG)).toBeGreaterThan(0.02)
    }
  })
})
