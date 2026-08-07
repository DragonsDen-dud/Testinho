import { describe, expect, it } from 'vitest'
import {
  HABIT_FIELD_KEYS,
  isHabitFieldVisible,
  resolveHabitFieldOrder,
  visibleHabitFieldOrder,
} from './habitFields'

describe('resolveHabitFieldOrder', () => {
  it('returns the default catalog order when nothing is configured', () => {
    expect(resolveHabitFieldOrder(undefined)).toEqual([...HABIT_FIELD_KEYS])
    expect(resolveHabitFieldOrder({})).toEqual([...HABIT_FIELD_KEYS])
  })

  it('honours a stored order', () => {
    const order = resolveHabitFieldOrder({ order: ['note', 'schedule', 'domain'] })
    expect(order.slice(0, 3)).toEqual(['note', 'schedule', 'domain'])
  })

  it('appends any catalog key the stored order predates, rather than dropping it', () => {
    // Simulates a config saved by an older build that had only three fields.
    const order = resolveHabitFieldOrder({ order: ['note', 'domain', 'icon'] })
    expect(order).toHaveLength(HABIT_FIELD_KEYS.length)
    for (const key of HABIT_FIELD_KEYS) expect(order).toContain(key)
    // The missing ones arrive in their default relative order, after the
    // stored ones.
    expect(order.slice(0, 3)).toEqual(['note', 'domain', 'icon'])
    expect(order.indexOf('timeBlock')).toBeLessThan(order.indexOf('schedule'))
  })

  it('drops a stored key this build no longer has, instead of rendering a blank row', () => {
    const order = resolveHabitFieldOrder({ order: ['note', 'a-field-that-was-removed', 'domain'] })
    expect(order).not.toContain('a-field-that-was-removed')
    expect(order).toHaveLength(HABIT_FIELD_KEYS.length)
  })

  it('collapses a duplicated key to its first occurrence', () => {
    const order = resolveHabitFieldOrder({ order: ['note', 'domain', 'note'] })
    expect(order.filter((k) => k === 'note')).toHaveLength(1)
    expect(order).toHaveLength(HABIT_FIELD_KEYS.length)
  })
})

describe('isHabitFieldVisible / visibleHabitFieldOrder', () => {
  it('treats every field as visible when nothing is configured', () => {
    for (const key of HABIT_FIELD_KEYS) expect(isHabitFieldVisible(undefined, key)).toBe(true)
    expect(visibleHabitFieldOrder(undefined)).toEqual([...HABIT_FIELD_KEYS])
  })

  it('hides exactly the listed keys and nothing else', () => {
    const config = { hidden: ['stake', 'dependsOn'] }
    expect(isHabitFieldVisible(config, 'stake')).toBe(false)
    expect(isHabitFieldVisible(config, 'dependsOn')).toBe(false)
    expect(isHabitFieldVisible(config, 'note')).toBe(true)

    const visible = visibleHabitFieldOrder(config)
    expect(visible).not.toContain('stake')
    expect(visible).not.toContain('dependsOn')
    expect(visible).toHaveLength(HABIT_FIELD_KEYS.length - 2)
  })

  it('preserves the configured order among the visible fields', () => {
    const visible = visibleHabitFieldOrder({ order: ['note', 'stake', 'domain'], hidden: ['stake'] })
    expect(visible.slice(0, 2)).toEqual(['note', 'domain'])
  })

  it('ignores an unknown key listed as hidden without affecting real ones', () => {
    const config = { hidden: ['not-a-real-field'] }
    expect(visibleHabitFieldOrder(config)).toEqual([...HABIT_FIELD_KEYS])
  })

  it('can hide every field at once without throwing', () => {
    const config = { hidden: [...HABIT_FIELD_KEYS] }
    expect(visibleHabitFieldOrder(config)).toEqual([])
  })
})
