import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useDomains } from '../state/useDomains'
import { createDomain, updateDomain, archiveDomain } from '../data/domains'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Sheet } from '../components/ui/Sheet'
import { Field, Input } from '../components/ui/Input'
import { SwatchPicker } from '../components/ui/SwatchPicker'
import { EmojiInput } from '../components/ui/EmojiInput'
import { PRESET_COLORS, PRESET_ICONS } from '../lib/presets'
import type { LifeDomain } from '../db/types'

export function DomainsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const domains = useDomains(settings?.activeSpaceId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LifeDomain | undefined>(undefined)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState(PRESET_ICONS[0])

  function openNew() {
    setEditing(undefined)
    setName('')
    setColor(PRESET_COLORS[0])
    setIcon(PRESET_ICONS[0])
    setFormOpen(true)
  }

  function openEdit(d: LifeDomain) {
    setEditing(d)
    setName(d.name)
    setColor(d.color)
    setIcon(d.icon)
    setFormOpen(true)
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('domains.title')}</h1>
        <div className="w-10" />
      </div>

      {domains.length === 0 && <EmptyState text={t('domains.empty')} />}

      <ul className="flex flex-col gap-2">
        {domains.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ background: d.color + '33' }}
            >
              {d.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{d.name}</span>
            <button className="text-xs text-[var(--stoa-text-muted)] px-2 py-1" onClick={() => openEdit(d)}>
              {t('common.edit')}
            </button>
            <button
              className="text-xs text-[var(--stoa-danger)] px-2 py-1"
              onClick={() => archiveDomain(d.id)}
            >
              {t('common.archive')}
            </button>
          </li>
        ))}
      </ul>

      <Button variant="secondary" onClick={openNew} disabled={!settings?.activeSpaceId}>
        + {t('domains.newDomain')}
      </Button>

      {formOpen && settings?.activeSpaceId && (
        <Sheet title={editing ? t('domains.editDomain') : t('domains.newDomain')} onClose={() => setFormOpen(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!name.trim()) return
              if (editing) {
                await updateDomain(editing.id, { name: name.trim(), color, icon })
              } else {
                await createDomain({ spaceId: settings.activeSpaceId!, name: name.trim(), color, icon })
              }
              setFormOpen(false)
            }}
          >
            <Field label={t('domains.name')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </Field>
            <Field label={t('domains.icon')}>
              <EmojiInput value={icon} onChange={setIcon} />
            </Field>
            <Field label={t('spaces.color')}>
              <SwatchPicker kind="color" options={PRESET_COLORS} value={color} onChange={setColor} />
            </Field>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}
