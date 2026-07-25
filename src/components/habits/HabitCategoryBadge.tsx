import { ArrowUp, Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Habit } from '../../db/types'
import { useDomains } from '../../state/useDomains'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { resolveCategoryStyle } from '../../data/categoryStyles'
import { ColorIconBadge } from '../ui/ColorIconBadge'

// Neutral fallback for a habit with no LifeDomain set (domainId is
// optional) — deliberately NOT run through the deterministic hash default,
// which would fabricate a fake "category" color for something that isn't
// one. Slate, already in PRESET_COLORS, so it isn't a new hardcoded hue.
const NO_DOMAIN_COLOR = '#64748b'
const NO_DOMAIN_ICON = 'Circle'

/**
 * The Part 1 "closed circuit" contract: this goes through the exact same
 * resolveCategoryStyle + useCategoryStyleMap path Pro Settings itself uses
 * (see data/categoryStyles.ts), never habit.domainId's LifeDomain.color
 * directly — so a category edited in Pro Settings renders identically
 * here, immediately, with no separate migration step. This is the one
 * piece of this round that actually starts consuming Part 1's data layer
 * (Tasks' ConnectedTaskCard still reads LifeDomain.color/Project.color
 * directly and hasn't been switched over yet — out of scope this round).
 */
export function HabitCategoryBadge({ habit, size = 'row' }: { habit: Habit; size?: 'row' | 'detail' }) {
  const { t } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const domain = domains.find((d) => d.id === habit.domainId)
  const styleMap = useCategoryStyleMap()

  const indicator = {
    icon: habit.habitType === 'avoid' ? Ban : ArrowUp,
    label: habit.habitType === 'avoid' ? t('habits.typeAvoid') : t('habits.typeBuild'),
  }

  if (!domain) {
    return <ColorIconBadge color={NO_DOMAIN_COLOR} icon={NO_DOMAIN_ICON} size={size} indicator={indicator} />
  }

  const explicitRow = styleMap.get(`lifeDomain:${domain.id}`)
  const style = resolveCategoryStyle('lifeDomain', domain.id, domain.color, explicitRow)
  return <ColorIconBadge color={style.color} icon={style.icon} size={size} indicator={indicator} />
}
