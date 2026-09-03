import type { Habit } from '../db/types'

/**
 * What a habit actually looks like, resolved once.
 *
 * A habit can now carry three kinds of identity, and every surface that
 * draws one — the tile, the tray bubble, the detail sheet, the picker's own
 * preview — has to agree about which wins. That agreement lives here rather
 * than in each component, which is the same "closed circuit" discipline
 * resolveCategoryStyle already enforces for colour.
 *
 * PRECEDENCE, and why: photo > emoji > drawn icon.
 *
 * It runs most-specific-first, i.e. in the order of how much the user had
 * to do to express the choice. Picking a photo of your own squat rack is a
 * deliberate, effortful act; picking an emoji is a tap; the drawn icon is
 * frequently just the domain's hash default that nobody chose at all.
 * Falling the other way would let an automatic default hide something the
 * user explicitly supplied.
 *
 * Each tier is additive and non-destructive: choosing an emoji does not
 * erase a photo, so switching back and forth in the picker never loses
 * work. The picker clears a field explicitly when the user asks it to.
 */
export type HabitLook =
  | { kind: 'photo'; image: Blob }
  | { kind: 'emoji'; emoji: string }
  | { kind: 'icon'; icon: string }

export function resolveHabitLook(
  habit: Pick<Habit, 'image' | 'emoji' | 'icon'>,
  /** The domain-resolved icon name, used when the habit has none of its own. */
  fallbackIcon: string,
): HabitLook {
  if (habit.image) return { kind: 'photo', image: habit.image }
  // A stored empty string means "cleared", not "chosen" — trim so a stray
  // space from an input can't masquerade as an emoji and blank the badge.
  const emoji = habit.emoji?.trim()
  if (emoji) return { kind: 'emoji', emoji }
  return { kind: 'icon', icon: habit.icon ?? fallbackIcon }
}

/**
 * True when the habit's look is its own choice rather than a default.
 *
 * Used by the tile to decide whether the art is worth giving the whole
 * surface to: a photo somebody picked earns a full-bleed treatment, a hash-
 * assigned folder glyph does not.
 */
export function isCustomLook(habit: Pick<Habit, 'image' | 'emoji' | 'icon'>): boolean {
  return !!habit.image || !!habit.emoji?.trim() || !!habit.icon
}
