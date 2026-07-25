import { PRESET_COLORS } from './presets'
import type { CategoryStyleEntityType } from '../db/types'

/**
 * Curated lucide-react icon names for category badges (STOA Design System
 * Part 1). Deliberately disjoint from icons already used for functional
 * purposes elsewhere (BottomNav, streak visualization, priority dots) so a
 * category badge never gets confused for a nav tab or a streak tier.
 * Append-only once shipped, same discipline as PRESET_COLORS/PRESET_ICONS —
 * an index picked by the hash below must keep meaning the same icon.
 */
export const CATEGORY_ICONS = [
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
] as const

export type CategoryIconName = (typeof CATEGORY_ICONS)[number]

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
    color: PRESET_COLORS[colorSeed % PRESET_COLORS.length],
    icon: CATEGORY_ICONS[iconSeed % CATEGORY_ICONS.length],
  }
}
