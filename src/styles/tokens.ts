// JS-side companions to src/styles/tokens.css. Durations live here (not in
// CSS) because Framer/JS-driven transitions and measured perf traces need a
// number, not a class name — the curve names match the --spring-*/--ease-*
// custom properties 1:1 so a component picks a purpose, not a raw value.

export const MOTION = {
  micro: { durationMs: 220, curve: 'var(--spring-snappy)' }, // checkbox, chip tap
  card: { durationMs: 320, curve: 'var(--spring-standard)' }, // swipe settle, subtask expand
  sheet: { durationMs: 400, curve: 'var(--ease-gentle)' }, // edit sheet, FAB menu
} as const

// PriorityLevel (src/db/types.ts) has no `color` field — the redesign brief
// assumes one exists ("pull from the user's own PriorityLevel.color if
// customized"), but it doesn't, and adding one would violate this round's
// zero-data-model-changes constraint. This is a deterministic fallback ramp
// keyed by sortOrder instead, reusing the same swatch set as
// src/lib/presets.ts PRESET_COLORS for visual consistency with the rest of
// the app rather than inventing a new palette.
const PRIORITY_FALLBACK_RAMP = ['#dc2626', '#d97706', '#2563eb', '#64748b']

export function priorityFallbackColor(sortOrder: number): string {
  const i = ((sortOrder % PRIORITY_FALLBACK_RAMP.length) + PRIORITY_FALLBACK_RAMP.length) % PRIORITY_FALLBACK_RAMP.length
  return PRIORITY_FALLBACK_RAMP[i]
}
