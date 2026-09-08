import { describe, expect, it } from 'vitest'
import {
  HABIT_TEMPLATES,
  HABIT_TEMPLATE_GROUPS,
  templatesInGroup,
  alreadyAddedKeys,
} from './habitLibrary'
import { pickQuoteForDate } from './dailyQuote'
import { normalizeQuoteText } from '../data/quotes'
import { CATEGORY_ICONS } from './categoryStyle'
import type { Quote } from '../db/types'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'

describe('habit library catalogue', () => {
  it('has unique keys', () => {
    const keys = HABIT_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('only references icons that exist in the registry', () => {
    // A typo renders the Folder fallback and looks like a bug rather than
    // a missing icon.
    const known = new Set<string>(CATEGORY_ICONS)
    for (const t of HABIT_TEMPLATES) expect(known.has(t.icon)).toBe(true)
  })

  it('every group is non-empty and every template belongs to a listed group', () => {
    for (const g of HABIT_TEMPLATE_GROUPS) expect(templatesInGroup(g).length).toBeGreaterThan(0)
    const listed = new Set<string>(HABIT_TEMPLATE_GROUPS)
    for (const t of HABIT_TEMPLATES) expect(listed.has(t.group)).toBe(true)
  })

  it('offers real avoid habits, not only things to build', () => {
    // Article 14/27 — an avoid habit forced to borrow build semantics is
    // the kind of mismatch that makes a preset list feel careless.
    expect(HABIT_TEMPLATES.filter((t) => t.habitType === 'avoid').length).toBeGreaterThanOrEqual(5)
  })

  it('has a translated name and unit for every template, in both languages', () => {
    // Article 11 — a library that only reads in English is a library half
    // the users skip. Asserted against the real locale files.
    for (const t of HABIT_TEMPLATES) {
      for (const [lang, dict] of [['en', en], ['ru', ru]] as const) {
        const items = (dict as Record<string, any>).habitLibrary?.items
        expect(items?.[t.key], `${lang} name for ${t.key}`).toBeTruthy()
        if (t.measurable) {
          const units = (dict as Record<string, any>).habitLibrary?.units
          expect(units?.[t.measurable.unitKey], `${lang} unit ${t.measurable.unitKey}`).toBeTruthy()
        }
      }
    }
  })

  it('has a translated label for every group, in both languages', () => {
    for (const g of HABIT_TEMPLATE_GROUPS) {
      expect((en as Record<string, any>).habitLibrary?.groups?.[g]).toBeTruthy()
      expect((ru as Record<string, any>).habitLibrary?.groups?.[g]).toBeTruthy()
    }
  })

  it('schedules are structurally valid for their type', () => {
    for (const t of HABIT_TEMPLATES) {
      if (t.schedule.type === 'specific_weekdays') {
        expect(t.schedule.params.weekdays?.length, t.key).toBeGreaterThan(0)
        for (const d of t.schedule.params.weekdays!) expect(d).toBeGreaterThanOrEqual(0)
      }
      if (t.schedule.type === 'weekly_n_times') expect(t.schedule.params.n, t.key).toBeGreaterThan(0)
    }
  })
})

describe('alreadyAddedKeys', () => {
  const nameOf = (t: { key: string }) => t.key
  const sample = HABIT_TEMPLATES.slice(0, 3)

  it('marks a template whose name the user already has', () => {
    const hit = alreadyAddedKeys(sample, [sample[1].key], nameOf)
    expect([...hit]).toEqual([sample[1].key])
  })

  it('ignores case and surrounding whitespace', () => {
    const hit = alreadyAddedKeys(sample, [`  ${sample[0].key.toUpperCase()} `], nameOf)
    expect(hit.has(sample[0].key)).toBe(true)
  })

  it('returns an empty set when nothing matches', () => {
    expect(alreadyAddedKeys(sample, ['something else'], nameOf).size).toBe(0)
  })
})

describe('pickQuoteForDate', () => {
  const q = (id: string): Quote => ({ id, spaceId: 's', text: id, createdAt: '', updatedAt: '' })

  it('returns nothing when the collection is empty', () => {
    expect(pickQuoteForDate([], '2026-09-08')).toBeUndefined()
  })

  it('is stable for the same day', () => {
    const list = [q('a'), q('b'), q('c')]
    // Today re-renders on every check-in; a quote that changed each time
    // would read as a glitch.
    expect(pickQuoteForDate(list, '2026-09-08')).toBe(pickQuoteForDate(list, '2026-09-08'))
  })

  it('does not depend on the order the rows arrive in', () => {
    const list = [q('a'), q('b'), q('c')]
    const shuffled = [q('c'), q('a'), q('b')]
    expect(pickQuoteForDate(list, '2026-09-08')?.id).toBe(pickQuoteForDate(shuffled, '2026-09-08')?.id)
  })

  it('rotates across days rather than pinning one quote forever', () => {
    const list = [q('a'), q('b'), q('c'), q('d'), q('e')]
    const seen = new Set(
      ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14']
        .map((d) => pickQuoteForDate(list, d)!.id),
    )
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('normalizeQuoteText', () => {
  it('strips a wrapping pair of quotation marks', () => {
    // The UI renders the text as a quotation, so stored marks would double
    // up into ""like this"".
    expect(normalizeQuoteText('"Do the work."')).toBe('Do the work.')
    expect(normalizeQuoteText('“Do the work.”')).toBe('Do the work.')
    expect(normalizeQuoteText('«Do the work.»')).toBe('Do the work.')
  })

  it('leaves inner punctuation alone', () => {
    expect(normalizeQuoteText('He said "no" and meant it')).toBe('He said "no" and meant it')
  })

  it('does not strip a lone or mismatched mark', () => {
    expect(normalizeQuoteText('"unbalanced')).toBe('"unbalanced')
    expect(normalizeQuoteText('“mismatched"')).toBe('“mismatched"')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeQuoteText('   spaced   ')).toBe('spaced')
  })
})
