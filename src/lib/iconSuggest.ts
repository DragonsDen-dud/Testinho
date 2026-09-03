import { CATEGORY_ICONS } from './categoryStyle'

/**
 * Guess a habit's icon and emoji from its name.
 *
 * THE PROBLEM. A new habit's icon is currently the *domain's* deterministic
 * hash default, so every habit in "Health" opens with the same arbitrary
 * glyph — and since the hash is seeded from the domain, that glyph has no
 * relationship to the habit at all. "Push ups", "Vitamins" and "Cold
 * shower" all start life as the same folder. That is the single biggest
 * reason the icons read as noise: most of them were never chosen, and none
 * of them were chosen *for that habit*.
 *
 * Matching on the name fixes the default rather than adding another thing
 * to configure. It stays a suggestion: HabitForm pre-fills with it and the
 * user overrides freely, and nothing is written unless they accept it.
 *
 * DELIBERATELY NOT AI. This runs offline, instantly, on every keystroke,
 * with no key and no request (Article 4). A keyword table is also
 * inspectable and testable, which a model call is not — and for the actual
 * job ("does this name contain a word I know a symbol for?") it is not
 * meaningfully worse.
 *
 * Bilingual: Article 11 makes ru a first-class language, and a Russian
 * habit name that matched nothing would silently make the feature look
 * broken for half the app's users.
 */
interface Rule {
  icon: (typeof CATEGORY_ICONS)[number]
  emoji: string
  /** Lowercase substrings. Matched against the whole name, so stems work
   * ("run" catches "running", "бег" catches "бегать"). */
  words: string[]
}

const RULES: Rule[] = [
  { icon: 'Dumbbell', emoji: '🏋️', words: ['gym', 'lift', 'weight', 'push up', 'pushup', 'press', 'squat', 'workout', 'training', 'зал', 'отжим', 'присед', 'трениров', 'штанг'] },
  { icon: 'Footprints', emoji: '🏃', words: ['run', 'jog', 'sprint', 'бег', 'пробеж'] },
  { icon: 'Footprints', emoji: '🚶', words: ['walk', 'steps', 'ходьб', 'прогул', 'шаг'] },
  { icon: 'Bike', emoji: '🚴', words: ['bike', 'cycl', 'ride', 'вело'] },
  { icon: 'Waves', emoji: '🏊', words: ['swim', 'pool', 'плав', 'бассейн'] },
  { icon: 'Mountain', emoji: '⛰️', words: ['hike', 'climb', 'mountain', 'поход', 'гор'] },
  { icon: 'Flower2', emoji: '🧘', words: ['yoga', 'stretch', 'mobility', 'йог', 'растяж'] },
  { icon: 'Wind', emoji: '🌬️', words: ['breath', 'breathing', 'дыхан', 'дыш'] },
  { icon: 'Brain', emoji: '🧘', words: ['meditat', 'mindful', 'медитац', 'осознан'] },
  { icon: 'Droplet', emoji: '💧', words: ['water', 'hydrat', 'drink', 'вод', 'пить'] },
  { icon: 'Salad', emoji: '🥗', words: ['salad', 'veg', 'greens', 'eat', 'meal', 'diet', 'салат', 'овощ', 'еда', 'питан'] },
  { icon: 'Utensils', emoji: '🍳', words: ['cook', 'breakfast', 'lunch', 'dinner', 'готов', 'завтрак', 'обед', 'ужин'] },
  { icon: 'Heart', emoji: '💊', words: ['vitamin', 'supplement', 'creatine', 'pill', 'medicat', 'витамин', 'добавк', 'креатин', 'таблет'] },
  { icon: 'Bed', emoji: '😴', words: ['sleep', 'bed', 'nap', 'rest', 'сон', 'спать', 'отдых'] },
  { icon: 'Sun', emoji: '🌅', words: ['wake', 'morning', 'sunrise', 'подъём', 'подъем', 'утро'] },
  { icon: 'Moon', emoji: '🌙', words: ['night', 'evening', 'вечер', 'ночь'] },
  { icon: 'Droplet', emoji: '🚿', words: ['shower', 'cold plunge', 'душ', 'закалив'] },
  { icon: 'BookOpen', emoji: '📚', words: ['read', 'book', 'pages', 'чита', 'книг', 'страниц'] },
  { icon: 'PenTool', emoji: '✍️', words: ['write', 'journal', 'diary', 'пиш', 'дневник', 'запис'] },
  { icon: 'GraduationCap', emoji: '🎓', words: ['study', 'learn', 'course', 'language', 'уч', 'курс', 'язык'] },
  { icon: 'Code2', emoji: '💻', words: ['code', 'program', 'ship', 'app', 'dev', 'кодить', 'программ', 'разработ'] },
  { icon: 'Briefcase', emoji: '💼', words: ['work', 'deep work', 'focus', 'inbox', 'email', 'работ', 'фокус', 'почт'] },
  { icon: 'Target', emoji: '🎯', words: ['goal', 'plan', 'review', 'цель', 'план', 'обзор'] },
  { icon: 'Wallet', emoji: '💰', words: ['budget', 'money', 'save', 'spend', 'бюджет', 'деньг', 'копить'] },
  { icon: 'Guitar', emoji: '🎸', words: ['guitar', 'music', 'practice', 'гитар', 'музык'] },
  { icon: 'Palette', emoji: '🎨', words: ['draw', 'paint', 'art', 'design', 'рисов', 'дизайн'] },
  { icon: 'Camera', emoji: '📷', words: ['photo', 'camera', 'фото'] },
  { icon: 'Users', emoji: '🫂', words: ['call', 'family', 'friend', 'partner', 'звон', 'семь', 'друз'] },
  { icon: 'Leaf', emoji: '🪴', words: ['plant', 'garden', 'растен', 'сад'] },
  { icon: 'Coffee', emoji: '☕', words: ['coffee', 'tea', 'кофе', 'чай'] },
  { icon: 'Smartphone', emoji: '📵', words: ['phone', 'screen', 'social', 'scroll', 'телефон', 'экран', 'соцсет'] },
  { icon: 'Wine', emoji: '🚭', words: ['smok', 'vape', 'cigarette', 'кур', 'сигарет'] },
  { icon: 'Wine', emoji: '🍺', words: ['alcohol', 'drink', 'beer', 'wine', 'алког', 'пиво', 'вино'] },
  { icon: 'Sparkles', emoji: '🧹', words: ['clean', 'tidy', 'chore', 'убор', 'чист'] },
]

export interface IconSuggestion {
  icon: (typeof CATEGORY_ICONS)[number]
  emoji: string
}

/**
 * The first rule whose keyword appears in the name, or undefined.
 *
 * First-match-wins on RULES order, which is why the table is written most
 * specific first — "cold shower" has to be reached before a generic
 * "drink"/"water" rule could claim it, and "push up" before "up".
 */
export function suggestForHabitName(name: string): IconSuggestion | undefined {
  const haystack = name.trim().toLowerCase()
  if (haystack.length < 2) return undefined
  for (const rule of RULES) {
    if (rule.words.some((w) => haystack.includes(w))) {
      return { icon: rule.icon, emoji: rule.emoji }
    }
  }
  return undefined
}
