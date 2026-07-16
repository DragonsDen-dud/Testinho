import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSpaces } from '../state/useSpaces'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { createSpace, updateSpace, archiveSpace } from '../data/spaces'
import { SpaceForm } from '../components/spaces/SpaceForm'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { Space } from '../db/types'

export function SpacesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const spaces = useSpaces()
  const settings = useAppSettings()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Space | undefined>(undefined)

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('spaces.title')}</h1>
        <div className="w-10" />
      </div>

      {spaces.length === 0 && <EmptyState text={t('spaces.empty')} />}

      <ul className="flex flex-col gap-2">
        {spaces.map((space) => (
          <li
            key={space.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ background: space.color + '33' }}
            >
              {space.icon}
            </span>
            <button
              className="flex-1 text-left text-sm font-medium"
              onClick={() => updateAppSettings({ activeSpaceId: space.id })}
            >
              {space.name}
              {settings?.activeSpaceId === space.id && (
                <span className="ml-2 text-xs text-[var(--stoa-accent)]">●</span>
              )}
            </button>
            <button
              className="text-xs text-[var(--stoa-text-muted)] px-2 py-1"
              onClick={() => {
                setEditing(space)
                setFormOpen(true)
              }}
            >
              {t('common.edit')}
            </button>
            <button
              className="text-xs text-[var(--stoa-danger)] px-2 py-1"
              onClick={() => {
                if (confirm(t('spaces.archiveConfirm'))) archiveSpace(space.id)
              }}
            >
              {t('common.archive')}
            </button>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        onClick={() => {
          setEditing(undefined)
          setFormOpen(true)
        }}
      >
        + {t('spaces.newSpace')}
      </Button>

      {formOpen && (
        <SpaceForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSave={async (data) => {
            if (editing) {
              await updateSpace(editing.id, data)
            } else {
              const space = await createSpace(data, settings?.language ?? 'en')
              if (!settings?.activeSpaceId) {
                await updateAppSettings({ activeSpaceId: space.id })
              }
            }
            setFormOpen(false)
          }}
        />
      )}
    </div>
  )
}
