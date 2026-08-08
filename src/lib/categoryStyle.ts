import { PRESET_COLORS } from './presets'
import type { CategoryStyleEntityType } from '../db/types'

/**
 * Icon names for category and habit badges.
 *
 * As of STOA-8 these resolve to STOA's own drawn set
 * (components/ui/icons/stoaIcons.tsx), not to lucide-react. The *names* are
 * deliberately unchanged from the Lucide identifiers they replace: they are
 * persisted on `Habit.icon` and `CategoryStyle.icon` rows and indexed by
 * the deterministic hash below, so renaming even one would mean a data
 * migration for an art change. Same identifiers, entirely new art, zero
 * migration.
 *
 * Deliberately disjoint from icons used for functional purposes elsewhere
 * (nav tabs, streak tiers, priority flags, status glyphs) so a badge never
 * reads as a nav tab or a status light.
 *
 * APPEND-ONLY, AND THE ORDER OF THE FIRST 20 IS FROZEN. The original set is
 * indices 0-19 exactly as it shipped; the lifestyle set is appended at
 * 20-39. See DEFAULT_ICON_POOL_SIZE for why appending is now genuinely
 * safe, which it was not before.
 */
export const CATEGORY_ICONS = [
  // ── 0-19: original set. Frozen order, never reordered or removed. ──
  'Folder',
  'Briefcase',
  'Heart',
  'BookOpen',
  'Dumbbell',
  'Wallet',
  'Building2',
  'Plane',
  'Music',
  'Palette',
  'Code2',
  'Coffee',
  'Users',
  'Target',
  'Zap',
  'Leaf',
  'Star',
  'ShoppingCart',
  'Utensils',
  'GraduationCap',
  // ── 20-39: STOA-8 lifestyle set. Chosen for what a habit actually is —
  // moving, eating, sleeping, thinking, making — rather than the
  // filing-cabinet vocabulary above, and balanced so `avoid` habits get
  // real symbols (Smartphone, Wine) instead of borrowing a build icon. ──
  'Bike',
  'Footprints',
  'Waves',
  'Mountain',
  'Droplet',
  'Salad',
  'Bed',
  'Sun',
  'Moon',
  'Brain',
  'Timer',
  'Wind',
  'Flower2',
  'Sparkles',
  'HandHeart',
  'Camera',
  'Guitar',
  'PenTool',
  'Smartphone',
  'Wine',
] as const

export type CategoryIconName = (typeof CATEGORY_ICONS)[number]

/**
 * Presentation-only grouping for the picker. Deliberately a separate
 * structure rather than a reordering of CATEGORY_ICONS, whose indices are
 * load-bearing — so the picker can be browsable at 40 without touching the
 * canonical list. `labelKey` resolves through i18n; icon names never do.
 */
export const CATEGORY_ICON_GROUPS: { labelKey: string; icons: CategoryIconName[] }[] = [
  {
    labelKey: 'iconGroups.everyday',
    icons: ['Folder', 'Briefcase', 'Building2', 'Code2', 'Wallet', 'ShoppingCart', 'Users', 'GraduationCap', 'Plane'],
  },
  { labelKey: 'iconGroups.movement', icons: ['Dumbbell', 'Bike', 'Footprints', 'Waves', 'Mountain'] },
  { labelKey: 'iconGroups.nourishment', icons: ['Coffee', 'Utensils', 'Salad', 'Droplet', 'Wine'] },
  { labelKey: 'iconGroups.rest', icons: ['Bed', 'Moon', 'Sun', 'Wind'] },
  { labelKey: 'iconGroups.mind', icons: ['Heart', 'Leaf', 'Brain', 'Timer', 'Flower2', 'Sparkles', 'HandHeart'] },
  { labelKey: 'iconGroups.creative', icons: ['Music', 'Palette', 'BookOpen', 'Camera', 'Guitar', 'PenTool'] },
  { labelKey: 'iconGroups.focus', icons: ['Target', 'Zap', 'Star', 'Smartphone'] },
]

/**
 * FNV-1a — small, dependency-free, stable across runs/platforms (unlike
 * String.prototype behavior, which is not guaranteed stable, and unlike
 * relying on insertion order/Math.random, which wouldn't be deterministic
 * at all). Only needs to be a decent-enough distribution for picking a
 * palette index, not cryptographically sound.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * How many entries the deterministic hash may choose from.
 *
 * THIS IS THE FIX FOR A REAL, ALREADY-SHIPPED BUG. The hash below picks an
 * index with `seed % array.length`, so the array's *length* is part of the
 * mapping — growing the array silently remaps most categories to a
 * different entry. "Append-only" was never sufficient on its own, despite
 * what the old comment claimed: when PRESET_COLORS grew from 8 to 12 in an
 * earlier round, roughly 63% of hash-defaulted categories quietly changed
 * colour, and the test guarding it passed because it only checked that the
 * array's order was preserved — which it was.
 *
 * Pinning the modulo to a fixed pool size decouples the mapping from the
 * array length. Both constants are set to the lengths the arrays had
 * *before* this round, so nothing changes today: every existing category
 * keeps the exact colour and icon it already had. From here on, appending
 * is finally as safe as the original comment assumed.
 *
 * The practical consequence, stated plainly: newly appended entries are
 * pickable but never auto-assigned. That suits what these lists are — the
 * hash dresses a LifeDomain (an abstract bucket, well served by the
 * original vocabulary), while the lifestyle icons exist to be chosen
 * deliberately for a specific habit. Raising a pool size later is a
 * one-line change, but it is a deliberate re-roll of everyone's defaults
 * and must be treated as one.
 */
export const DEFAULT_ICON_POOL_SIZE = 20
export const DEFAULT_COLOR_POOL_SIZE = 12

/**
 * Pure, deterministic default for a category with no explicit style yet.
 * Color and icon are hashed with different salts so they vary
 * independently (two categories landing on the same color don't also
 * always land on the same icon, and vice versa) — re-running this with the
 * same (entityType, entityId) always reproduces the exact same result,
 * which is what "reset to default" relies on (see data/categoryStyles.ts).
 */
export function getDeterministicDefault(
  entityType: CategoryStyleEntityType,
  entityId: string,
): { color: string; icon: string } {
  const colorSeed = fnv1a(`${entityType}:${entityId}:color`)
  const iconSeed = fnv1a(`${entityType}:${entityId}:icon`)
  return {
    color: PRESET_COLORS[colorSeed % DEFAULT_COLOR_POOL_SIZE],
    icon: CATEGORY_ICONS[iconSeed % DEFAULT_ICON_POOL_SIZE],
  }
}
