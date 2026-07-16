import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useProjects, projectProgress } from '../state/useProjects'
import { useTodos } from '../state/useTodos'
import { createTodo, updateTodo, archiveTodo, deleteTodo } from '../data/todos'
import { updateProject, archiveProject, deleteProject } from '../data/projects'
import { ProjectForm } from '../components/projects/ProjectForm'
import { TodoForm } from '../components/todos/TodoForm'
import { TodoItem } from '../components/todos/TodoItem'
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
          <TodoItem key={td.id} todo={td} onOpen={() => setEditingTodo(td)} />
        ))}
      </div>

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
            await deleteProject(project.id)
            navigate('/projects')
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
            } else {
              await createTodo(data)
            }
            setEditingTodo(null)
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
                  await deleteTodo(editingTodo.id)
                  setEditingTodo(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
