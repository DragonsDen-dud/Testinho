import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppSettings } from '../state/useAppSettings'
import { listTrashedHabits, restoreHabit, purgeHabit } from '../data/habits'
import { listTrashedTodos, restoreTodo, purgeTodo } from '../data/todos'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export function TrashPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaceId = settings?.activeSpaceId

  const trashedHabits = useLiveQuery(() => (spaceId ? listTrashedHabits(spaceId) : []), [spaceId]) ?? []
  const trashedTodos = useLiveQuery(() => (spaceId ? listTrashedTodos(spaceId) : []), [spaceId]) ?? []
  const isEmpty = trashedHabits.length === 0 && trashedTodos.length === 0

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

      {trashedHabits.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)] mb-2">{t('trash.habitsSection')}</h2>
          <ul className="flex flex-col gap-2">
            {trashedHabits.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
              >
                <span className="flex-1 text-sm font-medium">{h.name}</span>
                <Button variant="secondary" onClick={() => restoreHabit(h.id)}>
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('trash.deleteForeverConfirm'))) purgeHabit(h.id)
                  }}
                >
                  {t('trash.deleteForever')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {trashedTodos.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)] mb-2">{t('trash.todosSection')}</h2>
          <ul className="flex flex-col gap-2">
            {trashedTodos.map((td) => (
              <li
                key={td.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
              >
                <span className="flex-1 text-sm font-medium">{td.title}</span>
                <Button variant="secondary" onClick={() => restoreTodo(td.id)}>
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('trash.deleteForeverConfirm'))) purgeTodo(td.id)
                  }}
                >
                  {t('trash.deleteForever')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
