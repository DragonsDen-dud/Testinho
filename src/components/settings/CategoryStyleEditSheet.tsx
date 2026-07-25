import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { ColorIconBadge } from '../ui/ColorIconBadge'
import { PRESET_COLORS } from '../../lib/presets'
import { CATEGORY_ICONS } from '../../lib/categoryStyle'

// 44px — this round's own touch-target floor (acceptance criterion 4).
// Kept local to this sheet rather than raising SwatchPicker's existing
// 36px swatch buttons to match: SwatchPicker is shared with SpaceForm/
// ProjectForm/DomainsPage, all out of scope for this round, and resizing
// it would risk a visual shift there for a requirement that only applies
// to new UI.
const SWATCH_PX = 44

export function CategoryStyleEditSheet({
  categoryName,
  initialColor,
  initialIcon,
  onSave,
  onClose,
}: {
  categoryName: string
  initialColor: string
  initialIcon: string
  onSave: (value: { color: string; icon: string }) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [color, setColor] = useState(initialColor)
  const [icon, setIcon] = useState(initialIcon)

  return (
    <Sheet
      title={categoryName}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => onSave({ color, icon })}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex justify-center py-2">
          <ColorIconBadge color={color} icon={icon} size="detail" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('proSettings.color')}</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setColor(opt)}
                aria-label={opt}
                aria-pressed={color === opt}
                style={{ width: SWATCH_PX, height: SWATCH_PX, background: opt }}
                className={`rounded-full border-2 transition-transform ${
                  color === opt ? 'border-[var(--stoa-accent)] scale-105' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('proSettings.icon')}</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((name) => {
              const Icon: LucideIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[name]
              const selected = icon === name
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => setIcon(name)}
                  aria-label={name}
                  aria-pressed={selected}
                  style={{ width: SWATCH_PX, height: SWATCH_PX }}
                  className={`flex items-center justify-center rounded-full border-2 bg-[var(--stoa-surface)] transition-transform ${
                    selected ? 'border-[var(--stoa-accent)] scale-105' : 'border-[var(--stoa-border)]'
                  }`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
