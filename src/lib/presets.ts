// Existing entries are never reordered/removed, only appended to, same
// discipline as PRESET_ICONS below — a Space/LifeDomain/Project already
// pointing at an index must keep meaning the same color. Extended (not
// forked) for the STOA Design System round (Pro Settings) to give the
// deterministic per-category hash default enough distinguishable hues —
// 8 was on the thin side for auto-generated category colors, 12 sits in
// the CoinKeeper/Structured-reference range of ~8-12. The 4 additions
// (indigo/orange/cyan/fuchsia) were eyeballed against a standard
// deuteranopia reference: none of them sits next to a red/green or
// blue/purple pair of similar lightness. Pre-existing indices 5/6
// (amber/emerald) are a borderline orange-vs-green pair under
// deuteranopia, but that pairing shipped before this round and reordering
// it would break the same index-stability guarantee this comment is
// about — flagging, not fixing, here.
/**
 * STOA-5 "colorful minimalism" round — the values were raised in place from
 * a Tailwind-600-weight set to a 500-weight one. This is a *values* change,
 * not a new mechanism: the array, its length, its indices, and every
 * consumer (getDeterministicDefault's hash, resolveCategoryStyle,
 * ColorIconBadge, SwatchPicker) are untouched.
 *
 * Why 500 rather than 600: the old set was chosen to be safe on a white
 * background and, on the dark theme's #16151a canvas, read as muddy — a
 * 600-weight hue has too little luminance to feel alive against near-black,
 * which is exactly the "plays it safe / gray-on-gray" problem this round
 * was asked to fix. A 500 weight lifts luminance enough to stay vivid on
 * dark without reaching the fully-saturated territory that vibrates against
 * a dark canvas. This is the "bright doesn't mean busy" needle: the layout
 * discipline is unchanged, only the confidence of the color.
 *
 * INDEX AND HUE STABILITY, deliberately preserved. Each index keeps its
 * hue family (teal stays teal, violet stays violet, …) so a category whose
 * color comes from the deterministic hash shifts to a more vivid shade of
 * the same color — it never jumps to a different one. Nothing is reordered,
 * removed, or inserted; a category with an explicit Pro Settings override
 * keeps its exact saved hex and is unaffected by this entirely.
 * presets.test.ts enforces both properties.
 *
 * Index 7 is the one deliberate exception to "same family, more vivid":
 * slate-500 (#64748b) is the neutral of the set and was left at a
 * mid-weight rather than brightened, because a vivid gray is a
 * contradiction — it stays the quiet option in an otherwise loud palette.
 */
export const PRESET_COLORS = [
  '#14b8a6', // teal    (was #0d9488)
  '#8b5cf6', // violet  (was #7c3aed)
  '#ef4444', // red     (was #dc2626)
  '#3b82f6', // blue    (was #2563eb)
  '#f59e0b', // amber   (was #d97706)
  '#10b981', // emerald (was #059669)
  '#ec4899', // pink    (was #db2777)
  '#64748b', // slate   (unchanged — the palette's neutral, see above)
  '#6366f1', // indigo  (was #4f46e5)
  '#f97316', // orange  (was #ea580c)
  '#06b6d4', // cyan    (was #0891b2)
  '#d946ef', // fuchsia (was #c026d3)
]

// Space icon preset list. LifeDomain icons use free-text entry instead
// (EmojiInput) — this list is Space-only now. Existing entries are never
// reordered/removed, only appended to, so an already-picked index keeps
// meaning the same icon.
export const PRESET_ICONS = [
  '🏠',
  '💼',
  '🎯',
  '🌱',
  '⚡',
  '📚',
  '❤️',
  '🧘',
  '💰',
  '🎨',
  '🏃',
  '✈️',
  '🎮',
  '🌍',
  '👪',
]
