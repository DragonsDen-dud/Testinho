import { describe, expect, it } from 'vitest'
import { extractEmoji, extractEmojiFallback, pickTypedEmoji } from './emojiInput'

// Written out as escapes where the shape matters, so the test states what
// the sequence *is* rather than relying on an editor rendering it.
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}' // 👨‍👩‍👧 — three people, two ZWJs
const THUMBS_MEDIUM = '\u{1F44D}\u{1F3FD}' // 👍🏽 — base + skin-tone modifier
const FLAG_UA = '\u{1F1FA}\u{1F1E6}' // 🇺🇦 — two regional indicators
const KEYCAP_ONE = '1️⃣' // 1️⃣ — digit + VS16 + combining keycap
const HEART = '❤️' // ❤️ — text-default symbol promoted with VS16
const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 — tag sequence

// Both paths must agree on every case: the Segmenter path is what every
// target browser runs, the fallback is what a lagging engine runs.
const paths: [string, (raw: string) => string[]][] = [
  ['Intl.Segmenter', (raw) => extractEmoji(raw)],
  ['regex fallback', extractEmojiFallback],
]

describe.each(paths)('extractEmoji via %s', (_name, extract) => {
  it('returns a single simple emoji whole', () => {
    expect(extract('🦑')).toEqual(['🦑'])
  })

  it('keeps a ZWJ family sequence as one emoji, not three people and two joiners', () => {
    const [only, ...rest] = extract(FAMILY)
    expect(rest).toEqual([])
    expect(only).toBe(FAMILY)
    // The naive approach this replaces would have produced a lone
    // surrogate half — check we never hand back a fragment.
    expect(only.length).toBeGreaterThan(2)
  })

  it('keeps a skin-tone modifier attached to its base', () => {
    expect(extract(THUMBS_MEDIUM)).toEqual([THUMBS_MEDIUM])
  })

  it('keeps a flag as one emoji, not two letters', () => {
    expect(extract(FLAG_UA)).toEqual([FLAG_UA])
  })

  it('keeps a keycap sequence whole and does not mistake a bare digit for one', () => {
    expect(extract(KEYCAP_ONE)).toEqual([KEYCAP_ONE])
    expect(extract('1')).toEqual([])
  })

  it('keeps VS16-promoted symbols and tag-sequence flags whole', () => {
    expect(extract(HEART)).toEqual([HEART])
    expect(extract(ENGLAND)).toEqual([ENGLAND])
  })

  it('discards surrounding text and returns only the emoji', () => {
    expect(extract(`run ${FAMILY} every day`)).toEqual([FAMILY])
    expect(extract('abc🦑')).toEqual(['🦑'])
    expect(extract('🦑 squats')).toEqual(['🦑'])
  })

  it('returns several emoji in reading order, each whole', () => {
    expect(extract(`🦑${THUMBS_MEDIUM}${FLAG_UA}`)).toEqual(['🦑', THUMBS_MEDIUM, FLAG_UA])
  })

  it('returns nothing for plain text, whitespace, or an empty string', () => {
    expect(extract('')).toEqual([])
    expect(extract('   ')).toEqual([])
    expect(extract('push ups')).toEqual([])
    expect(extract('Отжимания')).toEqual([])
  })
})

describe('pickTypedEmoji — resolving a typed value to exactly one emoji', () => {
  it('returns the one emoji when exactly one was typed', () => {
    expect(pickTypedEmoji('🦑')).toBe('🦑')
    expect(pickTypedEmoji(FAMILY)).toBe(FAMILY)
  })

  it('drops text typed alongside an emoji', () => {
    expect(pickTypedEmoji('gym 🏋️ today')).toBe('🏋️')
  })

  it('with nothing chosen yet, the first emoji wins', () => {
    expect(pickTypedEmoji('🦑🐙')).toBe('🦑')
  })

  it('with a current emoji mirrored in the field, a newly appended one wins', () => {
    // A keyboard inserts at the caret, which sits after the mirrored
    // current value — so "<current><new>" is the normal shape of a tap.
    expect(pickTypedEmoji('🏃🦑', '🏃')).toBe('🦑')
    // ...and the caret at the start is handled too.
    expect(pickTypedEmoji('🦑🏃', '🏃')).toBe('🦑')
  })

  it('re-typing the current emoji keeps it rather than clearing it', () => {
    expect(pickTypedEmoji('🏃', '🏃')).toBe('🏃')
  })

  it('returns undefined for text with no emoji and for an empty value', () => {
    expect(pickTypedEmoji('abc', '🏃')).toBeUndefined()
    expect(pickTypedEmoji('', '🏃')).toBeUndefined()
  })

  it('never returns a fragment of a multi-code-point emoji', () => {
    for (const e of [FAMILY, THUMBS_MEDIUM, FLAG_UA, KEYCAP_ONE, HEART, ENGLAND]) {
      const picked = pickTypedEmoji(`x${e}y`)
      expect(picked).toBe(e)
      // A lone surrogate would fail this round trip.
      expect(() => encodeURIComponent(picked!)).not.toThrow()
    }
  })
})
