import type { HabitSchedule, HabitType } from '../db/types'

/**
 * A starter library of habits, offered as a way in rather than as a default.
 *
 * ARTICLE 1, WHICH THIS HAD TO BE DESIGNED AROUND. The spec is explicit
 * that STOA is not a tracker with a built-in set of categories for a
 * particular lifestyle, and that no line of code may encode the user's
 * interests, profession or life spheres. A branded, opinionated preset pack
 * would break that outright.
 *
 * What keeps this inside the rule: nothing here is applied automatically,
 * nothing is endorsed, and picking an item creates an ordinary Habit row
 * the user then owns and edits like any other. No app logic ever reads
 * these definitions again — there is no "library habit" type, no marker on
 * the record, no behaviour that depends on where a habit came from. The
 * catalogue is a set of prefilled forms, not a set of categories.
 *
 * They are also deliberately generic and widely applicable — sleep,
 * movement, reading, water — rather than tailored to any one person's
 * routine, for the same reason.
 *
 * Names and units are i18n keys, not literals: Article 11 makes ru a
 * first-class language, and a library that only reads well in English is
 * a library half the app's users would skip.
 */
export interface HabitTemplate {
  /** Stable id, also the i18n key under `habitLibrary.items.`. */
  key: string
  group: HabitTemplateGroup
  habitType: HabitType
  emoji: string
  icon: string
  schedule: HabitSchedule
  /** Present only for templates that are naturally counted. */
  measurable?: { targetValue: number; unitKey: string }
}

export type HabitTemplateGroup = 'movement' | 'rest' | 'nourishment' | 'mind' | 'work' | 'connection' | 'less'

const daily: HabitSchedule = { type: 'daily', params: {} }
const weekdays: HabitSchedule = { type: 'specific_weekdays', params: { weekdays: [1, 2, 3, 4, 5] } }
const threeAWeek: HabitSchedule = { type: 'weekly_n_times', params: { n: 3 } }

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // ── movement ──
  { key: 'walk', group: 'movement', habitType: 'build', emoji: '🚶', icon: 'Footprints', schedule: daily, measurable: { targetValue: 8000, unitKey: 'steps' } },
  { key: 'strength', group: 'movement', habitType: 'build', emoji: '🏋️', icon: 'Dumbbell', schedule: threeAWeek },
  { key: 'pushups', group: 'movement', habitType: 'build', emoji: '💪', icon: 'Dumbbell', schedule: daily, measurable: { targetValue: 30, unitKey: 'reps' } },
  { key: 'stretch', group: 'movement', habitType: 'build', emoji: '🧘', icon: 'Flower2', schedule: daily, measurable: { targetValue: 10, unitKey: 'minutes' } },
  { key: 'outside', group: 'movement', habitType: 'build', emoji: '🌤️', icon: 'Sun', schedule: daily, measurable: { targetValue: 20, unitKey: 'minutes' } },

  // ── rest ──
  { key: 'bedtime', group: 'rest', habitType: 'build', emoji: '🌙', icon: 'Moon', schedule: daily },
  { key: 'noScreensBeforeBed', group: 'rest', habitType: 'build', emoji: '📵', icon: 'Smartphone', schedule: daily },
  { key: 'wakeSameTime', group: 'rest', habitType: 'build', emoji: '🌅', icon: 'Sun', schedule: daily },
  { key: 'coldShower', group: 'rest', habitType: 'build', emoji: '🚿', icon: 'Droplet', schedule: daily },

  // ── nourishment ──
  { key: 'water', group: 'nourishment', habitType: 'build', emoji: '💧', icon: 'Droplet', schedule: daily, measurable: { targetValue: 8, unitKey: 'glasses' } },
  { key: 'vegetables', group: 'nourishment', habitType: 'build', emoji: '🥗', icon: 'Salad', schedule: daily },
  { key: 'protein', group: 'nourishment', habitType: 'build', emoji: '🍳', icon: 'Utensils', schedule: daily },
  { key: 'noEatingLate', group: 'nourishment', habitType: 'avoid', emoji: '🌜', icon: 'Moon', schedule: daily },

  // ── mind ──
  { key: 'read', group: 'mind', habitType: 'build', emoji: '📚', icon: 'BookOpen', schedule: daily, measurable: { targetValue: 10, unitKey: 'pages' } },
  { key: 'journal', group: 'mind', habitType: 'build', emoji: '✍️', icon: 'PenTool', schedule: daily },
  { key: 'meditate', group: 'mind', habitType: 'build', emoji: '🧠', icon: 'Brain', schedule: daily, measurable: { targetValue: 10, unitKey: 'minutes' } },
  { key: 'breathwork', group: 'mind', habitType: 'build', emoji: '🌬️', icon: 'Wind', schedule: daily },
  { key: 'learnLanguage', group: 'mind', habitType: 'build', emoji: '🈚', icon: 'GraduationCap', schedule: daily, measurable: { targetValue: 15, unitKey: 'minutes' } },

  // ── work ──
  { key: 'deepWork', group: 'work', habitType: 'build', emoji: '💻', icon: 'Code2', schedule: weekdays, measurable: { targetValue: 90, unitKey: 'minutes' } },
  { key: 'planTomorrow', group: 'work', habitType: 'build', emoji: '🎯', icon: 'Target', schedule: weekdays },
  { key: 'inboxZero', group: 'work', habitType: 'build', emoji: '📮', icon: 'Briefcase', schedule: weekdays },
  { key: 'weeklyReview', group: 'work', habitType: 'build', emoji: '📊', icon: 'Target', schedule: { type: 'specific_weekdays', params: { weekdays: [0] } } },
  { key: 'trackSpending', group: 'work', habitType: 'build', emoji: '💰', icon: 'Wallet', schedule: daily },

  // ── connection ──
  { key: 'callSomeone', group: 'connection', habitType: 'build', emoji: '📞', icon: 'Users', schedule: threeAWeek },
  { key: 'timeWithFamily', group: 'connection', habitType: 'build', emoji: '🫂', icon: 'HandHeart', schedule: daily },
  { key: 'gratitude', group: 'connection', habitType: 'build', emoji: '🙏', icon: 'HandHeart', schedule: daily },
  { key: 'tidy', group: 'connection', habitType: 'build', emoji: '🧹', icon: 'Sparkles', schedule: daily, measurable: { targetValue: 10, unitKey: 'minutes' } },

  // ── cutting back (avoid habits get real entries, Article 14/27) ──
  { key: 'noPhoneFirstHour', group: 'less', habitType: 'avoid', emoji: '📵', icon: 'Smartphone', schedule: daily },
  { key: 'noSocialScrolling', group: 'less', habitType: 'avoid', emoji: '📱', icon: 'Smartphone', schedule: daily },
  { key: 'noAlcohol', group: 'less', habitType: 'avoid', emoji: '🍺', icon: 'Wine', schedule: daily },
  { key: 'noSmoking', group: 'less', habitType: 'avoid', emoji: '🚭', icon: 'Wine', schedule: daily },
  { key: 'noSugar', group: 'less', habitType: 'avoid', emoji: '🍩', icon: 'Utensils', schedule: daily },
]

export const HABIT_TEMPLATE_GROUPS: HabitTemplateGroup[] = [
  'movement',
  'rest',
  'nourishment',
  'mind',
  'work',
  'connection',
  'less',
]

export function templatesInGroup(group: HabitTemplateGroup): HabitTemplate[] {
  return HABIT_TEMPLATES.filter((t) => t.group === group)
}

/**
 * Templates whose name already exists among the user's habits, so the
 * picker can mark them as added rather than silently creating a duplicate
 * the user then has to find and delete.
 *
 * Compared case- and whitespace-insensitively on the *translated* name,
 * because that is what the user actually sees and typed.
 */
export function alreadyAddedKeys(templates: HabitTemplate[], existingNames: string[], nameOf: (t: HabitTemplate) => string): Set<string> {
  const have = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  return new Set(templates.filter((t) => have.has(nameOf(t).trim().toLowerCase())).map((t) => t.key))
}
