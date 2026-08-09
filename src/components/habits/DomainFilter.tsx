import { useTranslation } from 'react-i18next'
import type { Habit, LifeDomain } from '../../db/types'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'

/**
 * Narrow the grid to one life domain.
 *
 * WHY. The grid is deliberately the whole screen, which works at eight
 * habits and stops working at twenty — at that point "what's left in Health"
 * means scrolling past everything else. A filter is the cheapest possible
 * answer: no new screen, no new concept, and the domains already exist.
 *
 * A domain with nothing in it today is not offered. A filter chip that
 * yields an empty grid is a dead end, and dead ends in a filter row are how
 * people conclude a feature is broken.
 *
 * Colours come from `resolveCategoryStyle`, the same resolver the badges
 * use, so a domain's chip and its habits' tiles are always the same colour —
 * the "closed circuit" rule. Never `LifeDomain.color` directly.
 */
export function DomainFilter({
  domains,
  habits,
  value,
  onChange,
}: {
  domains: LifeDomain[]
  /** The unfiltered set, used to hide domains with nothing to show. */
  habits: Habit[]
  value: string | null
  onChange: (domainId: string | null) => void
}) {
  const { t } = useTranslation()
  const styleMap = useCategoryStyleMap()

  const counts = new Map<string, number>()
  for (const habit of habits) {
    if (!habit.domainId) continue
    counts.set(habit.domainId, (counts.get(habit.domainId) ?? 0) + 1)
  }
  const offered = domains.filter((d) => (counts.get(d.id) ?? 0) > 0)
  if (offered.length < 2) return null

  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5"
      role="group"
      aria-label={t('habits.filterByDomain')}
    >
      <Chip label={t('habits.filterAll')} active={value === null} onClick={() => onChange(null)} />
      {offered.map((domain) => {
        const style = resolveHabitDomainStyle(domain.id, domains, styleMap)
        const active = value === domain.id
        return (
          <Chip
            key={domain.id}
            label={domain.name}
            count={counts.get(domain.id)}
            color={style.color}
            active={active}
            onClick={() => onChange(active ? null : domain.id)}
          />
        )
      })}
    </div>
  )
}

function Chip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count?: number
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="shrink-0 rounded-full pl-2.5 pr-3 py-1.5 text-xs flex items-center gap-1.5 border transition-colors stoa-focusable"
      style={{
        borderColor: active ? 'transparent' : 'var(--stoa-border)',
        background: active ? 'var(--stoa-accent-soft)' : 'transparent',
        color: 'var(--stoa-text)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {color && (
        <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      )}
      <span className="truncate max-w-[8rem]">{label}</span>
      {count !== undefined && <span className="tabular-nums opacity-55">{count}</span>}
    </button>
  )
}
