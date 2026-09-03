/**
 * Turning whatever the user typed into exactly one emoji.
 *
 * STOA-8 Part A — the habit look picker hands off to the device's own
 * keyboard (iOS/Android/desktop all expose an emoji key on any text field)
 * rather than shipping an in-app emoji keyboard. That means the field can
 * receive anything: a single emoji, an emoji with text around it, several
 * emoji, or plain text. `Habit.emoji` must hold one user-perceived emoji,
 * so this module resolves the raw string down to that.
 *
 * WHY NOT `.length` / `.slice(0, 1)`. An emoji is frequently several code
 * points that render as one glyph:
 *   - ZWJ sequences: 👨‍👩‍👧 is five code points joined by U+200D;
 *   - skin tones:    👍🏽 is a base plus a U+1F3FD modifier;
 *   - flags:         🇺🇦 is two regional-indicator symbols;
 *   - keycaps:       1️⃣ is a digit, U+FE0F and U+20E3;
 *   - text-default symbols promoted to emoji with U+FE0F: ❤️, ☕.
 * Slicing any of those by index yields a broken fragment (half a surrogate
 * pair, or a family with a member missing). The unit that matters is the
 * grapheme cluster, so segmentation is grapheme-aware:
 *
 *   1. `Intl.Segmenter` with `granularity: 'grapheme'` where available
 *      (Safari 14.1+, Chrome 87+, Firefox 125+ — every device this PWA
 *      targets). It implements UAX #29, so the four cases above each come
 *      back as one segment.
 *   2. A regex fallback that matches complete emoji runs (RI pairs, keycap
 *      sequences, pictographs with modifiers/VS16/tags and ZWJ joins) for
 *      an engine without the Segmenter. Only emoji runs are extracted —
 *      the surrounding text is discarded anyway, so the fallback does not
 *      need to segment it.
 *
 * WHICH ONE WINS when several are present: the field mirrors the current
 * emoji, and a keyboard inserts at the caret, so a fresh tap typically
 * arrives as "<current><new>" — the *new* one is the first emoji that is
 * not the one already chosen. With nothing chosen yet, the first emoji in
 * reading order wins. Everything else is dropped.
 */

const KEYCAP = '[0-9#*]\\uFE0F?\\u20E3'
const MODIFIERS = '(?:\\p{Emoji_Modifier}|\\uFE0F|\\u20E3|[\\u{E0020}-\\u{E007F}])*'
const PICTOGRAPH = `\\p{Extended_Pictographic}${MODIFIERS}`
const ZWJ_TAIL = `(?:\\u200D${PICTOGRAPH})*`

/** Matches one complete emoji run. Used both to classify a grapheme
 * (anchored) and to extract emoji from raw text in the fallback path. */
const EMOJI_RUN = `(?:\\p{Regional_Indicator}{2}|${KEYCAP}|${PICTOGRAPH})${ZWJ_TAIL}`
const IS_EMOJI_GRAPHEME = new RegExp(`^${EMOJI_RUN}$`, 'u')
const FALLBACK_EMOJI_RUNS = new RegExp(EMOJI_RUN, 'gu')

type GraphemeSegmenter = { segment(input: string): Iterable<{ segment: string }> }

function graphemeSegmenter(): GraphemeSegmenter | undefined {
  // Feature-detected rather than assumed: Firefox only shipped this in 2024
  // and a stale WebView can lag. The fallback below covers those.
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return undefined
  return new Intl.Segmenter(undefined, { granularity: 'grapheme' })
}

/**
 * Every emoji in `raw`, each as one whole grapheme cluster, in order.
 * Non-emoji graphemes (letters, digits, spaces, punctuation) are dropped.
 */
export function extractEmoji(raw: string, segmenter: GraphemeSegmenter | undefined = graphemeSegmenter()): string[] {
  if (!raw) return []
  if (!segmenter) return extractEmojiFallback(raw)
  const out: string[] = []
  for (const { segment } of segmenter.segment(raw)) {
    if (IS_EMOJI_GRAPHEME.test(segment)) out.push(segment)
  }
  return out
}

/** The no-`Intl.Segmenter` path, exported so it is testable on its own
 * rather than only reachable on a browser the test runner isn't. */
export function extractEmojiFallback(raw: string): string[] {
  return raw.match(FALLBACK_EMOJI_RUNS) ?? []
}

/**
 * The single emoji the typed value resolves to, or `undefined` when it
 * contains none (plain text, or empty — the caller decides what each of
 * those means; see HabitLookPicker).
 *
 * `current` is the emoji already chosen, so that "<current><new>" — what a
 * keyboard produces when the field mirrors the current choice and the
 * caret sits at the end — resolves to the new one rather than re-picking
 * the old.
 */
export function pickTypedEmoji(raw: string, current?: string): string | undefined {
  const found = extractEmoji(raw)
  if (found.length === 0) return undefined
  return found.find((e) => e !== current) ?? found[0]
}
