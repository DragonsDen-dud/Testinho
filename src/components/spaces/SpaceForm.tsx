import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, TextArea } from '../ui/Input'
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
  onSave: (data: { name: string; color: string; icon: string; northStar?: string }) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [icon, setIcon] = useState(initial?.icon ?? PRESET_ICONS[0])
  const [northStar, setNorthStar] = useState(initial?.northStar ?? '')

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="space-form">
        {t('common.save')}
      </Button>
    </div>
  )

  return (
    <Sheet title={initial ? t('spaces.editSpace') : t('spaces.newSpace')} onClose={onClose} footer={footer}>
      <form
        id="space-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSave({ name: name.trim(), color, icon, northStar: northStar.trim() || undefined })
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
        <Field label={t('spaces.northStar')}>
          <TextArea
            rows={2}
            placeholder={t('spaces.northStarPlaceholder')}
            value={northStar}
            onChange={(e) => setNorthStar(e.target.value)}
          />
        </Field>
      </form>
    </Sheet>
  )
}
