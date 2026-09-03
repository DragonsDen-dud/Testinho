import { describe, expect, it } from 'vitest'
import { resolveHabitLook, isCustomLook } from './habitLook'
import { suggestForHabitName } from './iconSuggest'
import { ALL_HABIT_EMOJI, EMOJI_GROUPS } from './habitEmoji'
import { CATEGORY_ICONS } from './categoryStyle'

const blob = () => new Blob(['x'], { type: 'image/jpeg' })

describe('resolveHabitLook', () => {
  it('falls back to the domain icon when the habit has nothing of its own', () => {
    expect(resolveHabitLook({}, 'Leaf')).toEqual({ kind: 'icon', icon: 'Leaf' })
  })

  it('prefers the habit’s own icon over the domain fallback', () => {
    expect(resolveHabitLook({ icon: 'Dumbbell' }, 'Leaf')).toEqual({ kind: 'icon', icon: 'Dumbbell' })
  })

  it('prefers an emoji over any icon', () => {
    expect(resolveHabitLook({ icon: 'Dumbbell', emoji: '🏋️' }, 'Leaf')).toEqual({ kind: 'emoji', emoji: '🏋️' })
  })

  it('prefers a photo over everything', () => {
    const image = blob()
    expect(resolveHabitLook({ image, emoji: '🏋️', icon: 'Dumbbell' }, 'Leaf')).toEqual({ kind: 'photo', image })
  })

  it('treats a blank emoji as unset rather than as a chosen empty badge', () => {
    // The failure this guards: a cleared field stored as '' or ' ' would
    // otherwise win precedence and render an empty badge, with the real
    // icon still sitting in the record underneath it.
    expect(resolveHabitLook({ emoji: '', icon: 'Dumbbell' }, 'Leaf')).toEqual({ kind: 'icon', icon: 'Dumbbell' })
    expect(resolveHabitLook({ emoji: '   ', icon: 'Dumbbell' }, 'Leaf')).toEqual({ kind: 'icon', icon: 'Dumbbell' })
  })

  it('keeps lower tiers intact so switching back and forth loses nothing', () => {
    const habit = { image: blob(), emoji: '🏋️', icon: 'Dumbbell' }
    // Dropping the photo must reveal the emoji, not the domain default.
    expect(resolveHabitLook({ ...habit, image: undefined }, 'Leaf').kind).toBe('emoji')
    expect(resolveHabitLook({ ...habit, image: undefined, emoji: undefined }, 'Leaf')).toEqual({
      kind: 'icon',
      icon: 'Dumbbell',
    })
  })

  it('isCustomLook distinguishes a chosen look from a domain default', () => {
    expect(isCustomLook({})).toBe(false)
    expect(isCustomLook({ emoji: ' ' })).toBe(false)
    expect(isCustomLook({ icon: 'Dumbbell' })).toBe(true)
    expect(isCustomLook({ image: blob() })).toBe(true)
  })
})

describe('habit emoji catalogue', () => {
  it('has no duplicates across groups', () => {
    // A duplicate would render two identical, separately-selectable cells
    // in the picker.
    expect(new Set(ALL_HABIT_EMOJI).size).toBe(ALL_HABIT_EMOJI.length)
  })

  it('offers enough per group to be worth grouping', () => {
    for (const g of EMOJI_GROUPS) expect(g.emoji.length).toBeGreaterThanOrEqual(10)
  })

  it('covers avoid habits, not only things to build', () => {
    // Article 14/27 — an avoid habit borrowing a build symbol is exactly
    // the kind of mismatch that made the old set feel arbitrary.
    expect(EMOJI_GROUPS.some((g) => g.key === 'avoid')).toBe(true)
  })
})

describe('suggestForHabitName', () => {
  it('matches the obvious cases', () => {
    expect(suggestForHabitName('Push Ups')?.icon).toBe('Dumbbell')
    expect(suggestForHabitName('Read 20 pages')?.icon).toBe('BookOpen')
    expect(suggestForHabitName('Drink water')?.icon).toBe('Droplet')
    expect(suggestForHabitName('Meditation')?.icon).toBe('Brain')
  })

  it('matches Russian names too (Article 11)', () => {
    expect(suggestForHabitName('Пробежка')?.icon).toBe('Footprints')
    expect(suggestForHabitName('Читать книгу')?.icon).toBe('BookOpen')
    expect(suggestForHabitName('Витамины')?.icon).toBe('Heart')
  })

  it('resolves overlapping keywords by rule order, most specific first', () => {
    // "Cold shower" contains neither "water" nor "drink", but the ordering
    // question is real for pairs like this — assert the intended winner
    // rather than assuming.
    expect(suggestForHabitName('Cold shower')?.emoji).toBe('🚿')
    // "Push up" must beat nothing else and must not be swallowed by a
    // shorter generic stem.
    expect(suggestForHabitName('Morning push ups')?.icon).toBe('Dumbbell')
  })

  it('returns undefined rather than guessing at an unknown name', () => {
    expect(suggestForHabitName('Xyzzy')).toBeUndefined()
    expect(suggestForHabitName('')).toBeUndefined()
    expect(suggestForHabitName('a')).toBeUndefined()
  })

  it('only ever suggests icons that exist in the registry', () => {
    // A typo here would render the Folder fallback and look like a bug.
    const names = new Set<string>(CATEGORY_ICONS)
    const samples = ['Push Ups', 'Run', 'Swim', 'Yoga', 'Water', 'Sleep', 'Read', 'Code', 'Coffee', 'Smoking', 'Clean']
    for (const s of samples) {
      const hit = suggestForHabitName(s)
      if (hit) expect(names.has(hit.icon)).toBe(true)
    }
  })
})
