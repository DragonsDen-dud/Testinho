import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppSettings } from '../state/useAppSettings'
import { listTrashedHabits, restoreHabit, purgeHabit } from '../data/habits'
import { listTrashedTodos, restoreTodo, purgeTodo } from '../data/todos'
import { listTrashedProjects, restoreProject, purgeProject } from '../data/projects'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

function TrashSection<T extends { id: string }>({
  title,
  items,
  label,
  onRestore,
  onPurgeForever,
  deleteForeverConfirmText,
}: {
  title: string
  items: T[]
  label: (item: T) => string
  onRestore: (id: string) => void
  onPurgeForever: (id: string) => void
  deleteForeverConfirmText: string
}): ReactNode {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="text-xs font-medium text-[var(--stoa-text-muted)] mb-2">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
          >
            <span className="flex-1 text-sm font-medium">{label(item)}</span>
            <Button variant="secondary" onClick={() => onRestore(item.id)}>
              {t('trash.restore')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(deleteForeverConfirmText)) onPurgeForever(item.id)
              }}
            >
              {t('trash.deleteForever')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TrashPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaceId = settings?.activeSpaceId

  const trashedHabits = useLiveQuery(() => (spaceId ? listTrashedHabits(spaceId) : []), [spaceId]) ?? []
  const trashedTodos = useLiveQuery(() => (spaceId ? listTrashedTodos(spaceId) : []), [spaceId]) ?? []
  const trashedProjects = useLiveQuery(() => (spaceId ? listTrashedProjects(spaceId) : []), [spaceId]) ?? []
  const isEmpty = trashedHabits.length === 0 && trashedTodos.length === 0 && trashedProjects.length === 0

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('trash.title')}</h1>
        <div className="w-10" />
      </div>

      <p className="text-xs text-[var(--stoa-text-muted)]">{t('trash.retentionNote')}</p>

      {isEmpty && <EmptyState text={t('trash.empty')} />}

      <TrashSection
        title={t('trash.habitsSection')}
        items={trashedHabits}
        label={(h) => h.name}
        onRestore={restoreHabit}
        onPurgeForever={purgeHabit}
        deleteForeverConfirmText={t('trash.deleteForeverConfirm')}
      />
      <TrashSection
        title={t('trash.todosSection')}
        items={trashedTodos}
        label={(td) => td.title}
        onRestore={restoreTodo}
        onPurgeForever={purgeTodo}
        deleteForeverConfirmText={t('trash.deleteForeverConfirm')}
      />
      <TrashSection
        title={t('trash.projectsSection')}
        items={trashedProjects}
        label={(p) => p.name}
        onRestore={restoreProject}
        onPurgeForever={purgeProject}
        deleteForeverConfirmText={t('trash.deleteForeverConfirm')}
      />
    </div>
  )
}
