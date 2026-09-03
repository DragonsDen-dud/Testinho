import { ArrowUp, Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Habit, LifeDomain, CategoryStyle } from '../../db/types'
import { useDomains } from '../../state/useDomains'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { resolveHabitLook } from '../../lib/habitLook'
import { useBlobUrl } from '../../lib/useBlobUrl'
import { resolveCategoryStyle } from '../../data/categoryStyles'
import { ColorIconBadge } from '../ui/ColorIconBadge'

// Neutral fallback for a habit with no LifeDomain set (domainId is
// optional) — deliberately NOT run through the deterministic hash default,
// which would fabricate a fake "category" color for something that isn't
// one. Slate, already in PRESET_COLORS, so it isn't a new hardcoded hue.
export const NO_DOMAIN_COLOR = '#64748b'
export const NO_DOMAIN_ICON = 'Circle'

/**
 * The domain-resolved {color, icon} for a habit — exported so Habits 2.0
 * Part A's creation-form icon picker can compute the same "what would this
 * badge show by default" value to pre-select, without duplicating the
 * resolution chain. Icon here is what HabitCategoryBadge falls back to
 * when `habit.icon` (Part A, per-habit override) is unset.
 */
export function resolveHabitDomainStyle(
  domainId: string | undefined,
  domains: LifeDomain[],
  styleMap: Map<string, CategoryStyle>,
): { color: string; icon: string } {
  const domain = domains.find((d) => d.id === domainId)
  if (!domain) return { color: NO_DOMAIN_COLOR, icon: NO_DOMAIN_ICON }
  const explicitRow = styleMap.get(`lifeDomain:${domain.id}`)
  return resolveCategoryStyle('lifeDomain', domain.id, domain.color, explicitRow)
}

/**
 * The Part 1 "closed circuit" contract: this goes through the exact same
 * resolveCategoryStyle + useCategoryStyleMap path Pro Settings itself uses
 * (see data/categoryStyles.ts), never habit.domainId's LifeDomain.color
 * directly — so a category edited in Pro Settings renders identically
 * here, immediately, with no separate migration step.
 *
 * Habits 2.0 Part A: `habit.icon`, when set, wins over the domain-resolved
 * icon — color is untouched by this and always stays domain-resolved, per
 * that round's own explicit "color keeps resolving from LifeDomain" rule.
 */
export function HabitCategoryBadge({ habit, size = 'row' }: { habit: Habit; size?: 'row' | 'tray' | 'detail' }) {
  const { t } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const styleMap = useCategoryStyleMap()

  const indicator = {
    icon: habit.habitType === 'avoid' ? Ban : ArrowUp,
    label: habit.habitType === 'avoid' ? t('habits.typeAvoid') : t('habits.typeBuild'),
  }

  const domainStyle = resolveHabitDomainStyle(habit.domainId, domains, styleMap)
  // Same resolver the tile uses, so a habit's photo/emoji/icon is the same
  // everywhere it appears — the "closed circuit" rule, extended from colour
  // to the art itself.
  const look = resolveHabitLook(habit, domainStyle.icon)
  const imageUrl = useBlobUrl(look.kind === 'photo' ? look.image : undefined)
  return (
    <ColorIconBadge
      color={domainStyle.color}
      icon={look.kind === 'icon' ? look.icon : domainStyle.icon}
      emoji={look.kind === 'emoji' ? look.emoji : undefined}
      imageUrl={imageUrl}
      size={size}
      indicator={indicator}
    />
  )
}
