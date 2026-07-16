import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { SwatchPicker } from '../ui/SwatchPicker'
import { PRESET_COLORS, PRESET_ICONS } from '../../lib/presets'
import type { Space } from '../../db/types'

export function SpaceForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Space
  onSave: (data: { name: string; color: string; icon: string }) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [icon, setIcon] = useState(initial?.icon ?? PRESET_ICONS[0])

  return (
    <Sheet title={initial ? t('spaces.editSpace') : t('spaces.newSpace')} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSave({ name: name.trim(), color, icon })
        }}
      >
        <Field label={t('spaces.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <Field label={t('spaces.icon')}>
          <SwatchPicker kind="icon" options={PRESET_ICONS} value={icon} onChange={setIcon} />
        </Field>
        <Field label={t('spaces.color')}>
          <SwatchPicker kind="color" options={PRESET_COLORS} value={color} onChange={setColor} />
        </Field>
        <div className="flex gap-2 justify-end mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
        </div>
      </form>
    </Sheet>
  )
}
