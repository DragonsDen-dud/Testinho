import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useProjects, projectProgress } from '../state/useProjects'
import { useTodos } from '../state/useTodos'
import { createTodo, updateTodo, archiveTodo, deleteTodo, restoreTodo } from '../data/todos'
import { updateProject, archiveProject, deleteProject, restoreProject } from '../data/projects'
import { showUndoToast } from '../state/toast'
import { ProjectForm } from '../components/projects/ProjectForm'
import { TodoForm } from '../components/todos/TodoForm'
import { TodoItem } from '../components/todos/TodoItem'
import { TodoDetailSheet } from '../components/todos/redesign/TodoDetailSheet'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { Todo } from '../db/types'

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const settings = useAppSettings()
  const projects = useProjects(settings?.activeSpaceId)
  const todos = useTodos(settings?.activeSpaceId)
  const [editingProject, setEditingProject] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | 'new' | null>(null)
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null)

  const project = projects.find((p) => p.id === id)
  const linkedTodos = todos.filter((td) => td.projectId === id && td.status !== 'archived')
  const progress = project ? projectProgress(todos, project.id) : { done: 0, total: 0, percent: 0 }

  if (!project) {
    return (
      <div className="p-4 max-w-md mx-auto w-full">
        <button onClick={() => navigate('/projects')} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <EmptyState text={t('projects.notFound')} />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/projects')} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <Button variant="ghost" onClick={() => setEditingProject(true)}>
          {t('common.edit')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color ?? 'var(--stoa-accent)' }} />
        <h1 className="text-lg font-semibold">{project.name}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar percent={progress.percent} />
        </div>
        <span className="text-xs text-[var(--stoa-text-muted)] shrink-0">
          {progress.done}/{progress.total}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('projects.linkedTodos')}</h2>
        <Button variant="secondary" onClick={() => setEditingTodo('new')}>
          + {t('todos.newTodo')}
        </Button>
      </div>

      {linkedTodos.length === 0 && <EmptyState text={t('projects.noTodos')} />}

      <div className="flex flex-col gap-2">
        {linkedTodos.map((td) => (
          <TodoItem key={td.id} todo={td} onOpen={() => setViewingTodo(td)} />
        ))}
      </div>

      {viewingTodo && (
        <TodoDetailSheet
          todo={viewingTodo}
          onClose={() => setViewingTodo(null)}
          onEdit={() => {
            setEditingTodo(viewingTodo)
            setViewingTodo(null)
          }}
        />
      )}

      {editingProject && settings?.activeSpaceId && (
        <ProjectForm
          spaceId={settings.activeSpaceId}
          initial={project}
          onClose={() => setEditingProject(false)}
          onSave={async (data) => {
            await updateProject(project.id, data)
            setEditingProject(false)
          }}
          onArchive={async () => {
            await archiveProject(project.id)
            navigate('/projects')
          }}
          onDelete={async () => {
            const id = project.id
            await deleteProject(id)
            navigate('/projects')
            showUndoToast(t('common.deletedToast'), () => restoreProject(id))
          }}
        />
      )}

      {editingTodo && settings?.activeSpaceId && (
        <TodoForm
          spaceId={settings.activeSpaceId}
          initial={editingTodo === 'new' ? undefined : editingTodo}
          defaultProjectId={project.id}
          onClose={() => setEditingTodo(null)}
          onSave={async (data) => {
            if (editingTodo !== 'new') {
              await updateTodo(editingTodo.id, data)
              return { ...editingTodo, ...data }
            }
            return createTodo(data)
          }}
          onArchive={
            editingTodo !== 'new'
              ? async () => {
                  await archiveTodo(editingTodo.id)
                  setEditingTodo(null)
                }
              : undefined
          }
          onDelete={
            editingTodo !== 'new'
              ? async () => {
                  const id = editingTodo.id
                  await deleteTodo(id)
                  setEditingTodo(null)
                  showUndoToast(t('common.deletedToast'), () => restoreTodo(id))
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
