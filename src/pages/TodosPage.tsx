import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useTodos, useOverdueTodos } from '../state/useTodos'
import { createTodo, updateTodo, archiveTodo, deleteTodo, moveToSomeday, promoteSomeday } from '../data/todos'
import { TodoForm } from '../components/todos/TodoForm'
import { TodoItem } from '../components/todos/TodoItem'
import { SomedayPromoteForm } from '../components/todos/SomedayPromoteForm'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { Todo } from '../db/types'

type Tab = 'open' | 'done' | 'someday'

export function TodosPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const settings = useAppSettings()
  const todos = useTodos(settings?.activeSpaceId)
  const overdue = useOverdueTodos(settings?.activeSpaceId)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<Tab>('open')
  const [promoting, setPromoting] = useState<Todo | null>(null)

  const editingTodo = params.id ? todos.find((td) => td.id === params.id) : undefined
  const formOpen = creating || (!!params.id && !!editingTodo)

  function closeForm() {
    setCreating(false)
    if (params.id) navigate('/todos')
  }

  const visible = todos.filter((td) => {
    if (tab === 'open') return td.status === 'open'
    if (tab === 'done') return td.status === 'done'
    return td.status === 'someday'
  })

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('todos.title')}</h1>
        <Button onClick={() => setCreating(true)}>+ {t('todos.newTodo')}</Button>
      </div>

      <button
        className="text-sm text-[var(--stoa-accent)] self-start"
        onClick={() => navigate('/projects')}
      >
        {t('projects.title')} →
      </button>

      {overdue.length > 0 && tab === 'open' && (
        <button
          className="rounded-xl bg-[var(--stoa-danger)]/10 border border-[var(--stoa-danger)]/30 px-3.5 py-2.5 text-sm text-[var(--stoa-danger)] flex items-center justify-between"
          onClick={() => navigate('/todos/overdue')}
        >
          <span>{t('dashboard.overdueBanner', { count: overdue.length })}</span>
          <span className="underline">{t('dashboard.reviewOverdue')}</span>
        </button>
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
        <button
          className={`text-sm px-3 py-1.5 rounded-full ${tab === 'someday' ? 'bg-[var(--stoa-border)]' : 'text-[var(--stoa-text-muted)]'}`}
          onClick={() => setTab('someday')}
        >
          {t('todos.statusSomeday')}
        </button>
      </div>

      {visible.length === 0 && (
        <EmptyState
          text={tab === 'open' ? t('todos.emptyOpen') : tab === 'someday' ? t('todos.emptySomeday') : t('todos.empty')}
        />
      )}

      <div className="flex flex-col gap-2">
        {visible.map((td) =>
          tab === 'someday' ? (
            <div key={td.id} className="flex flex-col gap-2">
              <TodoItem todo={td} onOpen={() => navigate(`/todos/${td.id}/edit`)} />
              <Button variant="secondary" onClick={() => setPromoting(td)}>
                {t('todos.startDoingThis')}
              </Button>
            </div>
          ) : (
            <TodoItem key={td.id} todo={td} onOpen={() => navigate(`/todos/${td.id}/edit`)} />
          ),
        )}
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
              await createTodo(data, tab === 'someday' ? 'someday' : 'open')
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
          onDelete={
            editingTodo
              ? async () => {
                  await deleteTodo(editingTodo.id)
                  closeForm()
                }
              : undefined
          }
          onMoveToSomeday={
            editingTodo
              ? async () => {
                  await moveToSomeday(editingTodo.id)
                  closeForm()
                }
              : undefined
          }
        />
      )}

      {promoting && (
        <SomedayPromoteForm
          todo={promoting}
          onClose={() => setPromoting(null)}
          onPromote={async (dueDate, priorityLevelId) => {
            await promoteSomeday(promoting.id, dueDate, priorityLevelId)
            setPromoting(null)
            setTab('open')
          }}
        />
      )}
    </div>
  )
}
