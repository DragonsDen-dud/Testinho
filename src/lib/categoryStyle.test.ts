import { describe, expect, it } from 'vitest'
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  DEFAULT_COLOR_POOL_SIZE,
  DEFAULT_ICON_POOL_SIZE,
  getDeterministicDefault,
} from './categoryStyle'
import { STOA_ICON_NAMES, hasStoaIcon } from '../components/ui/icons/iconRegistry'
import { ICON_ART } from '../components/ui/icons/stoaIconArt'
import { PRESET_COLORS } from './presets'

describe('getDeterministicDefault', () => {
  it('is a pure function of (entityType, entityId) — same input always gives the same output', () => {
    const a = getDeterministicDefault('lifeDomain', 'domain-1')
    const b = getDeterministicDefault('lifeDomain', 'domain-1')
    expect(a).toEqual(b)
  })

  it('always returns a color from PRESET_COLORS and an icon from CATEGORY_ICONS', () => {
    for (const id of ['a', 'b', 'c', 'domain-1', 'project-99']) {
      const result = getDeterministicDefault('lifeDomain', id)
      expect(PRESET_COLORS).toContain(result.color)
      expect(CATEGORY_ICONS).toContain(result.icon)
    }
  })

  it('varies color and icon independently rather than always pairing together', () => {
    // If color/icon were hashed from the exact same seed, every entityId
    // landing on the same color index would also always land on the same
    // icon index. Find at least one pair among a small sample that shares
    // a color but not an icon (or vice versa) to prove independence.
    const ids = Array.from({ length: 30 }, (_, i) => `id-${i}`)
    const results = ids.map((id) => getDeterministicDefault('project', id))
    const sameColorDifferentIcon = results.some((r, i) =>
      results.some((r2, j) => i !== j && r.color === r2.color && r.icon !== r2.icon),
    )
    expect(sameColorDifferentIcon).toBe(true)
  })

  it('gives different entity types their own namespace — same entityId across types can differ', () => {
    // Not a strict requirement that they always differ, just confirms the
    // entityType is actually part of the hash input, not ignored.
    const domain = getDeterministicDefault('lifeDomain', 'shared-id')
    const project = getDeterministicDefault('project', 'shared-id')
    expect(domain.color !== project.color || domain.icon !== project.icon).toBe(true)
  })
})

/**
 * Captured from the shipped implementation BEFORE the icon set grew from
 * 20 to 40. These are the defaults real installs already have; if appending
 * to CATEGORY_ICONS or PRESET_COLORS ever changes them again, this fails
 * loudly instead of silently re-rolling every user's categories — which is
 * exactly what happened, unnoticed, when PRESET_COLORS went 8 -> 12.
 */
const REGRESSION_LOCK = [
  { color: '#f59e0b', icon: 'Folder' },
  { color: '#f59e0b', icon: 'Music' },
  { color: '#f97316', icon: 'BookOpen' },
  { color: '#ef4444', icon: 'Utensils' },
  { color: '#ec4899', icon: 'Building2' },
]

describe('STOA-8 — icon set expansion', () => {
  it('doubles the set to 40', () => {
    expect(CATEGORY_ICONS).toHaveLength(40)
  })

  it('keeps the original 20 in their exact original positions', () => {
    expect(CATEGORY_ICONS.slice(0, 20)).toEqual([
      'Folder', 'Briefcase', 'Heart', 'BookOpen', 'Dumbbell', 'Wallet', 'Building2', 'Plane', 'Music', 'Palette',
      'Code2', 'Coffee', 'Users', 'Target', 'Zap', 'Leaf', 'Star', 'ShoppingCart', 'Utensils', 'GraduationCap',
    ])
  })

  it('has no duplicate names', () => {
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length)
  })

  it('never reuses an icon that carries a functional meaning elsewhere', () => {
    const RESERVED = [
      'Home', 'Repeat', 'ListChecks', 'NotebookPen', 'CalendarDays', 'BarChart3', 'Search', 'Settings',
      'Flame', 'Sprout', 'Trophy', 'Flag', 'TrendingDown', 'MoonStar', 'Check', 'X', 'GripVertical',
      'Download', 'RotateCcw', 'CalendarCheck',
    ]
    for (const reserved of RESERVED) expect(CATEGORY_ICONS).not.toContain(reserved)
  })

  it('has drawn art for every single name — no name can render an empty badge', () => {
    for (const name of CATEGORY_ICONS) expect(hasStoaIcon(name)).toBe(true)
  })

  it('ships no art that no name refers to', () => {
    for (const drawn of STOA_ICON_NAMES) expect(CATEGORY_ICONS).toContain(drawn)
  })

  it('keeps the name registry exactly in step with the art map', () => {
    expect([...STOA_ICON_NAMES].sort()).toEqual(Object.keys(ICON_ART).sort())
  })

  it('exposes every icon through exactly one picker group', () => {
    const grouped = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual([...CATEGORY_ICONS].sort())
  })

  it('gives every group a distinct, non-empty i18n label key', () => {
    const keys = CATEGORY_ICON_GROUPS.map((g) => g.labelKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const g of CATEGORY_ICON_GROUPS) {
      expect(g.labelKey).toMatch(/^iconGroups\./)
      expect(g.icons.length).toBeGreaterThan(0)
    }
  })
})

describe('deterministic defaults survive the set growing (the STOA-8 fix)', () => {
  it('only ever picks from the pinned pools, never from appended entries', () => {
    const poolIcons = CATEGORY_ICONS.slice(0, DEFAULT_ICON_POOL_SIZE)
    const poolColors = PRESET_COLORS.slice(0, DEFAULT_COLOR_POOL_SIZE)
    for (let i = 0; i < 400; i += 1) {
      const { color, icon } = getDeterministicDefault('lifeDomain', `id-${i}`)
      expect(poolIcons).toContain(icon)
      expect(poolColors).toContain(color)
    }
  })

  it('reproduces known pre-existing defaults exactly — the regression lock', () => {
    const sample = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((id) =>
      getDeterministicDefault('lifeDomain', id),
    )
    expect(sample).toEqual(REGRESSION_LOCK)
  })

  it('varies colour and icon independently', () => {
    const byColor = new Map<string, Set<string>>()
    for (let i = 0; i < 200; i += 1) {
      const { color, icon } = getDeterministicDefault('lifeDomain', `v-${i}`)
      if (!byColor.has(color)) byColor.set(color, new Set())
      byColor.get(color)!.add(icon)
    }
    expect([...byColor.values()].filter((icons) => icons.size > 1).length).toBeGreaterThan(0)
  })
})
