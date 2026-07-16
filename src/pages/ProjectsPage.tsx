import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useProjects, projectProgress } from '../state/useProjects'
import { useTodos } from '../state/useTodos'
import { createProject } from '../data/projects'
import { ProjectForm } from '../components/projects/ProjectForm'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const projects = useProjects(settings?.activeSpaceId)
  const todos = useTodos(settings?.activeSpaceId)
  const [creating, setCreating] = useState(false)

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/todos')} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('projects.title')}</h1>
        <Button onClick={() => setCreating(true)}>+ {t('projects.newProject')}</Button>
      </div>

      {projects.length === 0 && <EmptyState text={t('projects.empty')} />}

      <div className="flex flex-col gap-2">
        {projects.map((project) => {
          const progress = projectProgress(todos, project.id)
          return (
            <button
              key={project.id}
              className="text-left rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3 flex flex-col gap-2"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: project.color ?? 'var(--stoa-accent)' }}
                />
                <span className="text-sm font-semibold flex-1">{project.name}</span>
                <span className="text-xs text-[var(--stoa-text-muted)]">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <ProgressBar percent={progress.percent} />
            </button>
          )
        })}
      </div>

      {creating && settings?.activeSpaceId && (
        <ProjectForm
          spaceId={settings.activeSpaceId}
          onClose={() => setCreating(false)}
          onSave={async (data) => {
            const project = await createProject(data)
            setCreating(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}
    </div>
  )
}
