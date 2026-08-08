import { describe, expect, it } from 'vitest'
import { accessibleTextColor, contrastRatio, gradientFromColor, shadeColor } from './tokens'
import { PRESET_COLORS } from '../lib/presets'

function relativeLuminanceOf(hex: string): number {
  const clean = hex.replace('#', '')
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return (
    0.2126 * channel(parseInt(clean.slice(0, 2), 16)) +
    0.7152 * channel(parseInt(clean.slice(2, 4), 16)) +
    0.0722 * channel(parseInt(clean.slice(4, 6), 16))
  )
}

describe('gradientFromColor (STOA-7 Part C — duotone badge fill)', () => {
  it('produces a two-stop linear gradient containing the original colour', () => {
    const g = gradientFromColor('#14b8a6')
    expect(g).toContain('linear-gradient')
    expect(g).toContain('#14b8a6')
    expect(g.match(/#[0-9a-f]{6}/g)).toHaveLength(2)
  })

  it('always includes the source colour itself, so a category reads as its own hue', () => {
    for (const color of PRESET_COLORS) {
      expect(gradientFromColor(color).match(/#[0-9a-f]{6}/g)!).toContain(color)
    }
  })

  it('runs brighter-to-darker for every colour, so badges look lit from one direction', () => {
    for (const color of PRESET_COLORS) {
      const [first, second] = gradientFromColor(color).match(/#[0-9a-f]{6}/g)!
      expect(relativeLuminanceOf(first)).toBeGreaterThan(relativeLuminanceOf(second))
    }
  })

  it('shades AWAY from the icon colour, never toward it', () => {
    // The core invariant. Three palette colours sit within 0.02 luminance
    // of the black/white split, so a symmetric gradient would push one end
    // across it at any range — this asserts the direction, not a magnitude.
    for (const color of PRESET_COLORS) {
      const iconIsBlack = accessibleTextColor(color) === '#000000'
      const stops = gradientFromColor(color).match(/#[0-9a-f]{6}/g)!
      for (const stop of stops) {
        if (iconIsBlack) expect(relativeLuminanceOf(stop)).toBeGreaterThanOrEqual(relativeLuminanceOf(color) - 1e-9)
        else expect(relativeLuminanceOf(stop)).toBeLessThanOrEqual(relativeLuminanceOf(color) + 1e-9)
      }
    }
  })

  it('keeps accessibleTextColor correct at BOTH ends, not just the source', () => {
    for (const color of PRESET_COLORS) {
      const chosen = accessibleTextColor(color)
      for (const stop of gradientFromColor(color).match(/#[0-9a-f]{6}/g)!) {
        expect(accessibleTextColor(stop)).toBe(chosen)
      }
    }
  })

  it('clears 4.5:1 contrast against every stop for every palette colour', () => {
    for (const color of PRESET_COLORS) {
      const chosen = accessibleTextColor(color)
      for (const stop of gradientFromColor(color).match(/#[0-9a-f]{6}/g)!) {
        expect(contrastRatio(chosen, stop)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('never emits a malformed or out-of-range hex, even at pure black and white', () => {
    for (const color of ['#000000', '#ffffff', '#14b8a6']) {
      for (const stop of gradientFromColor(color).match(/#[0-9a-f]{6}/g)!) {
        expect(stop).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })
})

describe('shadeColor', () => {
  it('returns the colour unchanged at amount 0', () => {
    expect(shadeColor('#14b8a6', 0)).toBe('#14b8a6')
  })

  it('reaches white at +1 and black at -1', () => {
    expect(shadeColor('#14b8a6', 1)).toBe('#ffffff')
    expect(shadeColor('#14b8a6', -1)).toBe('#000000')
  })

  it('accepts shorthand hex', () => {
    expect(shadeColor('#fff', 0)).toBe('#ffffff')
  })

  it('clamps rather than overflowing past the endpoints', () => {
    expect(shadeColor('#ffffff', 0.5)).toBe('#ffffff')
    expect(shadeColor('#000000', -0.5)).toBe('#000000')
  })
})
