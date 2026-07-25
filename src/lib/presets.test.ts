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

const ORIGINAL_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#2563eb', '#d97706', '#059669', '#db2777', '#64748b']

describe('PRESET_COLORS (Space/LifeDomain/Project color picker)', () => {
  it('keeps every original color in its original order — a category picked by index must keep meaning the same color', () => {
    expect(PRESET_COLORS.slice(0, ORIGINAL_COLORS.length)).toEqual(ORIGINAL_COLORS)
  })

  it('adds exactly 4 new colors (STOA Design System round), all distinct from the original set', () => {
    const added = PRESET_COLORS.slice(ORIGINAL_COLORS.length)
    expect(added).toHaveLength(4)
    for (const color of added) expect(ORIGINAL_COLORS).not.toContain(color)
  })

  it('has no duplicate entries at all', () => {
    expect(new Set(PRESET_COLORS).size).toBe(PRESET_COLORS.length)
  })
})
