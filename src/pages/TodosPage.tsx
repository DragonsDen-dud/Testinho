import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useTodos, useOverdueTodos } from '../state/useTodos'
import { createTodo, updateTodo, archiveTodo, deleteTodo, restoreTodo, moveToSomeday, promoteSomeday } from '../data/todos'
import { showUndoToast } from '../state/toast'
import { TodoForm } from '../components/todos/TodoForm'
import { ConnectedTaskCard } from '../components/todos/redesign/ConnectedTaskCard'
import { SectionHeading } from '../components/todos/redesign/SectionHeading'
import { SomedayPromoteForm } from '../components/todos/SomedayPromoteForm'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MicButton } from '../components/ui/MicButton'
import { EmptyState } from '../components/ui/EmptyState'
import { appendTranscript } from '../lib/speechRecognition'
import type { Todo } from '../db/types'

type Tab = 'open' | 'done'

export function TodosPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const settings = useAppSettings()
  const todos = useTodos(settings?.activeSpaceId)
  const overdueTodos = useOverdueTodos(settings?.activeSpaceId)
  const [creating, setCreating] = useState(false)
  const [creatingSomeday, setCreatingSomeday] = useState(false)
  const [quickCreateTitle, setQuickCreateTitle] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('open')
  const [somedayExpanded, setSomedayExpanded] = useState(false)
  const [promoting, setPromoting] = useState<Todo | null>(null)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  // Article 49 — the FAB's "Task" option opens the real full TodoForm (not
  // the title-only quick-add row above), navigating here with ?new=1.
  // `title` carries over whatever was typed into the Part 1 compact
  // quick-create modal before the user chose "Open full editor".
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreating(true)
      setQuickCreateTitle(searchParams.get('title') ?? undefined)
      setSearchParams((prev) => {
        prev.delete('new')
        prev.delete('title')
        return prev
      })
    }
  }, [searchParams, setSearchParams])

  async function submitQuickAdd() {
    const title = quickAddTitle.trim()
    if (!title || !settings?.activeSpaceId) return
    await createTodo({ spaceId: settings.activeSpaceId, title, criticalReminder: false })
    setQuickAddTitle('')
  }

  const editingTodo = params.id ? todos.find((td) => td.id === params.id) : undefined
  const formOpen = creating || (!!params.id && !!editingTodo)

  function closeForm() {
    setCreating(false)
    setCreatingSomeday(false)
    setQuickCreateTitle(undefined)
    if (params.id) navigate('/todos')
  }

  function openNewTodoForm(intoSomeday: boolean) {
    setCreatingSomeday(intoSomeday)
    setCreating(true)
  }

  function openTodo(id: string) {
    navigate(`/todos/${id}/edit`)
  }

  const overdueIds = new Set(overdueTodos.map((t) => t.id))
  const activeTodos = todos.filter((td) => td.status === 'open' && !overdueIds.has(td.id))
  const somedayTodos = todos.filter((td) => td.status === 'someday')
  const doneTodos = todos.filter((td) => td.status === 'done')

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('todos.title')}</h1>
        <Button onClick={() => openNewTodoForm(false)}>+ {t('todos.newTodo')}</Button>
      </div>

      <form
        className="flex gap-2 items-center"
        onSubmit={(e) => {
          e.preventDefault()
          void submitQuickAdd()
        }}
      >
        <Input
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          placeholder={t('todos.quickAddPlaceholder')}
          className="flex-1"
        />
        <MicButton
          lang={i18n.language}
          onTranscript={(transcript) => setQuickAddTitle((prev) => appendTranscript(prev, transcript))}
        />
      </form>

      <button
        className="text-sm text-[var(--stoa-accent)] self-start"
        onClick={() => navigate('/projects')}
      >
        {t('projects.title')} →
      </button>

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

      {tab === 'open' && (
        <div className="flex flex-col gap-5">
          {overdueTodos.length > 0 && (
            <div className="section-overdue flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <SectionHeading label={t('todos.sectionOverdue')} />
                <button className="text-xs text-[var(--stoa-accent)]" onClick={() => navigate('/todos/overdue')}>
                  {t('dashboard.reviewOverdue')}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {overdueTodos.map((td) => (
                  <ConnectedTaskCard key={td.id} todo={td} onOpen={() => openTodo(td.id)} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <SectionHeading label={t('todos.sectionActive')} />
            {activeTodos.length === 0 ? (
              <EmptyState text={t('todos.emptyOpen')} />
            ) : (
              <div className="flex flex-col gap-2">
                {activeTodos.map((td) => (
                  <ConnectedTaskCard key={td.id} todo={td} onOpen={() => openTodo(td.id)} />
                ))}
              </div>
            )}
          </div>

          <div className="section-someday flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center justify-between rounded-card p-4 bg-surface card-shadow text-left"
              style={{ border: '2px solid var(--color-status-border)' }}
              onClick={() => setSomedayExpanded((v) => !v)}
            >
              <span className="text-task-meta text-ink-muted">
                {somedayTodos.length > 0 ? t('todos.somedayCollapsedRow', { count: somedayTodos.length }) : t('todos.statusSomeday')}
              </span>
              <span aria-hidden className="text-ink-muted text-xs">
                {somedayExpanded ? '⌄' : '›'}
              </span>
            </button>
            {somedayExpanded && (
              <div className="flex flex-col gap-3">
                {somedayTodos.map((td) => (
                  <div key={td.id} className="flex flex-col gap-2">
                    <ConnectedTaskCard todo={td} onOpen={() => openTodo(td.id)} />
                    <Button variant="secondary" onClick={() => setPromoting(td)}>
                      {t('todos.startDoingThis')}
                    </Button>
                  </div>
                ))}
                {somedayTodos.length === 0 && <EmptyState text={t('todos.emptySomeday')} />}
                <Button variant="secondary" onClick={() => openNewTodoForm(true)}>
                  + {t('todos.newTodo')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'done' &&
        (doneTodos.length === 0 ? (
          <EmptyState text={t('todos.empty')} />
        ) : (
          <div className="flex flex-col gap-2">
            {doneTodos.map((td) => (
              <ConnectedTaskCard key={td.id} todo={td} onOpen={() => openTodo(td.id)} />
            ))}
          </div>
        ))}

      {formOpen && settings?.activeSpaceId && (
        <TodoForm
          spaceId={settings.activeSpaceId}
          initial={editingTodo}
          initialTitle={quickCreateTitle}
          onClose={closeForm}
          onSave={async (data) => {
            if (editingTodo) {
              await updateTodo(editingTodo.id, data)
            } else {
              await createTodo(data, creatingSomeday ? 'someday' : 'open')
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
                  const id = editingTodo.id
                  await deleteTodo(id)
                  closeForm()
                  showUndoToast(t('common.deletedToast'), () => restoreTodo(id))
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
