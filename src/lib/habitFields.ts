import type { HabitFieldConfig } from '../db/types'

/**
 * Part 3b — the catalog of habit fields Denys can show/hide and reorder
 * from inside the app, without an engineering round per change.
 *
 * Deliberately NOT a custom-field builder (that's a much larger idea, see
 * the round report's follow-up list). This is a visibility + order config
 * over the fields the schema already has, stored once per install in
 * `AppSettings.habitFieldConfig`.
 *
 * `name` and `type` are absent from this list on purpose: a habit cannot be
 * created without a name, and `habitType` drives Article 14's entire
 * build/avoid polarity (including how a check-in is interpreted and how
 * Habit Strength is scored), so neither is a display preference. Everything
 * else here is optional at the schema level already.
 *
 * Hiding a field never clears it. HabitForm seeds each field's state from
 * the habit being edited and submits that state regardless of whether the
 * input rendered, so a habit that already has (say) a stake keeps it while
 * the stake field is hidden, and shows it again untouched when unhidden.
 */
export const HABIT_FIELD_KEYS = [
  'domain',
  'timeBlock',
  'icon',
  'schedule',
  'measurable',
  'reminderTimes',
  'criticalReminder',
  'stake',
  'dependsOn',
  'pause',
  // STOA-5: this key no longer maps to a form field — the dead top-level
  // Habit.note was removed. It now controls only whether the habit detail
  // view shows the latest check-in note (HabitLog.note). Deliberately kept
  // under the same key rather than renamed, so an existing stored
  // habitFieldConfig continues to work with no migration.
  'note',
] as const

export type HabitFieldKey = (typeof HABIT_FIELD_KEYS)[number]

function isKnownKey(key: string): key is HabitFieldKey {
  return (HABIT_FIELD_KEYS as readonly string[]).includes(key)
}

/**
 * The stored order, made safe to render from.
 *
 * Two failure modes this exists to absorb, both of which are ordinary
 * rather than exceptional in a local-first app whose database outlives any
 * one build:
 *  - a stored key this build no longer has (a field removed in a later
 *    round) is dropped rather than rendered as a blank row;
 *  - a key this build has but the stored order predates (a field added in a
 *    later round) is appended in its default position rather than silently
 *    vanishing from the form.
 * Duplicates are collapsed to the first occurrence.
 */
export function resolveHabitFieldOrder(config: HabitFieldConfig | undefined): HabitFieldKey[] {
  const stored = config?.order ?? []
  const ordered: HabitFieldKey[] = []
  for (const key of stored) {
    if (isKnownKey(key) && !ordered.includes(key)) ordered.push(key)
  }
  for (const key of HABIT_FIELD_KEYS) {
    if (!ordered.includes(key)) ordered.push(key)
  }
  return ordered
}

/** Visible unless explicitly hidden — an install that never opens the
 * setting (config undefined) sees every field, exactly as before. */
export function isHabitFieldVisible(config: HabitFieldConfig | undefined, key: HabitFieldKey): boolean {
  return !(config?.hidden ?? []).includes(key)
}

/** The resolved order with hidden keys removed — what a rendering surface
 * actually iterates. */
export function visibleHabitFieldOrder(config: HabitFieldConfig | undefined): HabitFieldKey[] {
  return resolveHabitFieldOrder(config).filter((key) => isHabitFieldVisible(config, key))
}
