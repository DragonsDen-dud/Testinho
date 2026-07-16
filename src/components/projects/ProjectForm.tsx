import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { SwatchPicker } from '../ui/SwatchPicker'
import { PRESET_COLORS } from '../../lib/presets'
import { useDomains } from '../../state/useDomains'
import type { Project } from '../../db/types'
import type { NewProjectInput } from '../../data/projects'

export function ProjectForm({
  spaceId,
  initial,
  onSave,
  onClose,
  onArchive,
  onDelete,
}: {
  spaceId: string
  initial?: Project
  onSave: (data: NewProjectInput) => void
  onClose: () => void
  onArchive?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const domains = useDomains(spaceId)
  const [name, setName] = useState(initial?.name ?? '')
  const [domainId, setDomainId] = useState(initial?.domainId ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  return (
    <Sheet title={initial ? t('projects.editProject') : t('projects.newProject')} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSave({ spaceId, name: name.trim(), domainId: domainId || undefined, color })
        }}
      >
        <Field label={t('projects.name')}>
          <Input
            autoFocus
            placeholder={t('projects.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label={t('projects.domain')}>
          <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            <option value="">{t('common.none')}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('projects.color')}>
          <SwatchPicker kind="color" options={PRESET_COLORS} value={color} onChange={setColor} />
        </Field>

        <div className="flex gap-2 justify-between mt-2">
          {initial && (onArchive || onDelete) ? (
            <div className="flex gap-2">
              {onArchive && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('projects.archiveConfirm'))) onArchive()
                  }}
                >
                  {t('common.archive')}
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('projects.deleteConfirm'))) onDelete()
                  }}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </div>
      </form>
    </Sheet>
  )
}
