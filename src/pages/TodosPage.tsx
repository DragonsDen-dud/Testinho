import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useTodos } from '../state/useTodos'
import { createTodo, updateTodo, archiveTodo } from '../data/todos'
import { TodoForm } from '../components/todos/TodoForm'
import { TodoItem } from '../components/todos/TodoItem'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { todayKey } from '../lib/date'

type Tab = 'open' | 'done'

export function TodosPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const settings = useAppSettings()
  const todos = useTodos(settings?.activeSpaceId)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<Tab>('open')

  const editingTodo = params.id ? todos.find((td) => td.id === params.id) : undefined
  const formOpen = creating || (!!params.id && !!editingTodo)

  function closeForm() {
    setCreating(false)
    if (params.id) navigate('/todos')
  }

  const visible = todos.filter((td) => (tab === 'open' ? td.status === 'open' : td.status === 'done'))
  const key = todayKey()
  const overdue = todos.filter((td) => td.status === 'open' && td.dueDate && td.dueDate < key)

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('todos.title')}</h1>
        <Button onClick={() => setCreating(true)}>+ {t('todos.newTodo')}</Button>
      </div>

      {overdue.length > 0 && tab === 'open' && (
        <div className="rounded-xl bg-[var(--stoa-danger)]/10 border border-[var(--stoa-danger)]/30 px-3.5 py-2.5 text-sm text-[var(--stoa-danger)] flex items-center justify-between">
          <span>{t('dashboard.overdueBanner', { count: overdue.length })}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          className={`text-sm px-3 py-1.5 rounded-full ${tab === 'open' ? 'bg-[var(--stoa-border)]' : 'text-[var(--stoa-text-muted)]'}`}
          onClick={() => setTab('open')}
        >
          {t('todos.statusOpen')}
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-full ${tab === 'done' ? 'bg-[var(--stoa-border)]' : 'text-[var(--stoa-text-muted)]'}`}
          onClick={() => setTab('done')}
        >
          {t('todos.statusDone')}
        </button>
      </div>

      {visible.length === 0 && <EmptyState text={tab === 'open' ? t('todos.emptyOpen') : t('todos.empty')} />}

      <div className="flex flex-col gap-2">
        {visible.map((td) => (
          <TodoItem key={td.id} todo={td} onOpen={() => navigate(`/todos/${td.id}/edit`)} />
        ))}
      </div>

      {formOpen && settings?.activeSpaceId && (
        <TodoForm
          spaceId={settings.activeSpaceId}
          initial={editingTodo}
          onClose={closeForm}
          onSave={async (data) => {
            if (editingTodo) {
              await updateTodo(editingTodo.id, data)
            } else {
              await createTodo(data)
            }
            closeForm()
          }}
          onArchive={
            editingTodo
              ? async () => {
                  await archiveTodo(editingTodo.id)
                  closeForm()
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
