import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { useAppSettings } from '../state/useAppSettings'
import { useDomains } from '../state/useDomains'
import { useProjects } from '../state/useProjects'
import { useCategoryStyleMap } from '../state/useCategoryStyles'
import { resolveCategoryStyle, setCategoryStyle, resetCategoryStyle, resetAllCategoryStyles } from '../data/categoryStyles'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ColorIconBadge } from '../components/ui/ColorIconBadge'
import { MinimalListRow } from '../components/ui/MinimalListRow'
import { CategoryStyleEditSheet } from '../components/settings/CategoryStyleEditSheet'
import type { CategoryStyleEntityType } from '../db/types'

interface CategoryRow {
  entityType: CategoryStyleEntityType
  entityId: string
  name: string
  nativeColor: string | undefined
}

export function ProSettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const domains = useDomains(settings?.activeSpaceId)
  const projects = useProjects(settings?.activeSpaceId)
  const styleMap = useCategoryStyleMap()
  const [editing, setEditing] = useState<CategoryRow | undefined>(undefined)

  const rows: CategoryRow[] = [
    ...domains.map((d) => ({ entityType: 'lifeDomain' as const, entityId: d.id, name: d.name, nativeColor: d.color })),
    ...projects.map((p) => ({ entityType: 'project' as const, entityId: p.id, name: p.name, nativeColor: p.color })),
  ]

  async function handleReset(row: CategoryRow) {
    await resetCategoryStyle(row.entityType, row.entityId)
  }

  async function handleResetAll() {
    if (rows.length === 0) return
    if (!confirm(t('proSettings.resetAllConfirm'))) return
    await resetAllCategoryStyles(rows.map(({ entityType, entityId }) => ({ entityType, entityId })))
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('proSettings.title')}</h1>
        <div className="w-10" />
      </div>

      <p className="text-xs text-[var(--stoa-text-muted)]">{t('proSettings.subtitle')}</p>

      {rows.length === 0 && <EmptyState text={t('proSettings.empty')} />}

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const explicitRow = styleMap.get(`${row.entityType}:${row.entityId}`)
          const style = resolveCategoryStyle(row.entityType, row.entityId, row.nativeColor, explicitRow)
          return (
            <li key={`${row.entityType}:${row.entityId}`}>
              <MinimalListRow
                badge={<ColorIconBadge color={style.color} icon={style.icon} size="row" />}
                title={row.name}
                subtitle={
                  row.entityType === 'lifeDomain' ? t('proSettings.entityTypeLifeDomain') : t('proSettings.entityTypeProject')
                }
                onClick={() => setEditing(row)}
                trailing={
                  <button
                    type="button"
                    aria-label={t('proSettings.reset')}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReset(row)
                    }}
                    className="flex items-center justify-center w-11 h-11 -my-2 text-[var(--stoa-text-muted)]"
                  >
                    <RotateCcw size={18} aria-hidden />
                  </button>
                }
              />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2 pt-2">
        <Button variant="secondary" onClick={() => navigate('/settings/pro-settings/summary')}>
          {t('proSettings.viewSummary')}
        </Button>
        <Button variant="danger" onClick={handleResetAll} disabled={rows.length === 0}>
          {t('proSettings.resetAll')}
        </Button>
      </div>

      {editing &&
        (() => {
          const editingStyle = resolveCategoryStyle(
            editing.entityType,
            editing.entityId,
            editing.nativeColor,
            styleMap.get(`${editing.entityType}:${editing.entityId}`),
          )
          return (
            <CategoryStyleEditSheet
              categoryName={editing.name}
              initialColor={editingStyle.color}
              initialIcon={editingStyle.icon}
              onClose={() => setEditing(undefined)}
              onSave={async ({ color, icon }) => {
                await setCategoryStyle(editing.entityType, editing.entityId, { color, icon })
                setEditing(undefined)
              }}
            />
          )
        })()}
    </div>
  )
}
