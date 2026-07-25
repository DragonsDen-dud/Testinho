import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { getDeterministicDefault } from '../lib/categoryStyle'
import { resolveCategoryStyle, setCategoryStyle, resetCategoryStyle, resetAllCategoryStyles } from './categoryStyles'

beforeEach(async () => {
  await db.categoryStyles.clear()
})

describe('resolveCategoryStyle fallback chain', () => {
  it('uses the explicit row when one exists, ignoring nativeColor entirely', () => {
    const explicit = { id: 'lifeDomain:d1', entityType: 'lifeDomain' as const, entityId: 'd1', color: '#111111', icon: 'Heart', updatedAt: '2026-01-01' }
    const result = resolveCategoryStyle('lifeDomain', 'd1', '#ffffff', explicit)
    expect(result).toEqual({ color: '#111111', icon: 'Heart', isExplicit: true })
  })

  it('falls back to the native color (with hash icon) when no explicit row exists', () => {
    const result = resolveCategoryStyle('lifeDomain', 'd1', '#abcdef', undefined)
    expect(result.color).toBe('#abcdef')
    expect(result.icon).toBe(getDeterministicDefault('lifeDomain', 'd1').icon)
    expect(result.isExplicit).toBe(false)
  })

  it('falls back to the pure hash default for both color and icon when neither a row nor a native color exists', () => {
    const result = resolveCategoryStyle('project', 'p1', undefined, undefined)
    expect(result).toEqual({ ...getDeterministicDefault('project', 'p1'), isExplicit: false })
  })
})

describe('setCategoryStyle / resetCategoryStyle', () => {
  it('persists an explicit edit, retrievable afterward', async () => {
    await setCategoryStyle('project', 'p1', { color: '#123456', icon: 'Zap' })
    const row = await db.categoryStyles.get('project:p1')
    expect(row?.color).toBe('#123456')
    expect(row?.icon).toBe('Zap')
  })

  it('reset overwrites an edit with the pure hash default, not the native color', async () => {
    await setCategoryStyle('lifeDomain', 'd1', { color: '#ff00ff', icon: 'Star' })
    await resetCategoryStyle('lifeDomain', 'd1')
    const row = await db.categoryStyles.get('lifeDomain:d1')
    expect(row).toMatchObject(getDeterministicDefault('lifeDomain', 'd1'))
  })

  it('reset is deterministic — resetting twice gives the same result both times', async () => {
    await resetCategoryStyle('project', 'p2')
    const first = await db.categoryStyles.get('project:p2')
    await setCategoryStyle('project', 'p2', { color: '#000000', icon: 'Star' })
    await resetCategoryStyle('project', 'p2')
    const second = await db.categoryStyles.get('project:p2')
    expect(second?.color).toBe(first?.color)
    expect(second?.icon).toBe(first?.icon)
  })
})

describe('resetAllCategoryStyles', () => {
  it('writes a deterministic-default row for every entry in one batch', async () => {
    await resetAllCategoryStyles([
      { entityType: 'lifeDomain', entityId: 'd1' },
      { entityType: 'project', entityId: 'p1' },
    ])
    const d1 = await db.categoryStyles.get('lifeDomain:d1')
    const p1 = await db.categoryStyles.get('project:p1')
    expect(d1).toMatchObject(getDeterministicDefault('lifeDomain', 'd1'))
    expect(p1).toMatchObject(getDeterministicDefault('project', 'p1'))
  })
})
