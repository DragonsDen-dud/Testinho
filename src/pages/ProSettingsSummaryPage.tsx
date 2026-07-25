import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useDomains } from '../state/useDomains'
import { useProjects } from '../state/useProjects'
import { useCategoryStyleMap } from '../state/useCategoryStyles'
import { resolveCategoryStyle } from '../data/categoryStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ColorIconBadge } from '../components/ui/ColorIconBadge'
import { MinimalListRow } from '../components/ui/MinimalListRow'

/**
 * Read-only "closed circuit" audit surface — every category with its
 * current live badge, grouped by entity type. Deliberately reads through
 * the same useCategoryStyleMap/resolveCategoryStyle path ProSettingsPage
 * uses (a Dexie live query), not a cached/point-in-time snapshot, so an
 * edit made and then navigated straight here is reflected immediately.
 */
export function ProSettingsSummaryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const domains = useDomains(settings?.activeSpaceId)
  const projects = useProjects(settings?.activeSpaceId)
  const styleMap = useCategoryStyleMap()

  const groups = [
    {
      key: 'lifeDomain' as const,
      label: t('proSettings.entityTypeLifeDomainPlural'),
      items: domains.map((d) => ({ entityId: d.id, name: d.name, nativeColor: d.color })),
    },
    {
      key: 'project' as const,
      label: t('proSettings.entityTypeProjectPlural'),
      items: projects.map((p) => ({ entityId: p.id, name: p.name, nativeColor: p.color })),
    },
  ]
  const isEmpty = groups.every((g) => g.items.length === 0)

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('proSettings.summaryTitle')}</h1>
        <div className="w-10" />
      </div>

      {isEmpty && <EmptyState text={t('proSettings.empty')} />}

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.key} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide">{group.label}</h2>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const explicitRow = styleMap.get(`${group.key}:${item.entityId}`)
                  const style = resolveCategoryStyle(group.key, item.entityId, item.nativeColor, explicitRow)
                  return (
                    <li key={item.entityId}>
                      <MinimalListRow
                        badge={<ColorIconBadge color={style.color} icon={style.icon} size="row" />}
                        title={item.name}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ),
      )}
    </div>
  )
}
