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
export const PRESET_COLORS = [
  '#0d9488',
  '#7c3aed',
  '#dc2626',
  '#2563eb',
  '#d97706',
  '#059669',
  '#db2777',
  '#64748b',
  '#4f46e5', // indigo
  '#ea580c', // orange
  '#0891b2', // cyan
  '#c026d3', // fuchsia
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
