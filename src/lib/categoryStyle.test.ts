import { describe, expect, it } from 'vitest'
import { CATEGORY_ICONS, getDeterministicDefault } from './categoryStyle'
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
