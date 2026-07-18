import { describe, expect, it } from 'vitest'
import { PRESET_ICONS } from './presets'

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
