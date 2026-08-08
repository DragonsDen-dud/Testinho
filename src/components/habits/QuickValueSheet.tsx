import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import type { Habit } from '../../db/types'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { logMeasurableEntry, clearHabitLog } from '../../data/habits'

/**
 * Value entry for a measurable habit, from the tile grid.
 *
 * Denys's instruction on this landed in two parts — first "suppress the
 * quantity, just yes/no", then, correcting himself, "actually keep push-ups
 * count". So measurable habits are kept in full: the schema, the stored
 * entries, and Article 24's multiple-entries-per-day behaviour are all
 * untouched. What changed is only that the count is no longer in the way of
 * the *common* case — a plain habit is now a single tap on its tile, and
 * only a measurable habit opens this.
 *
 * Pre-filled with the target so the common case ("did my 20") stays one tap
 * plus Save, with the steppers there for the day it was 12.
 */
export function QuickValueSheet({
  habit,
  date,
  currentTotal,
  onClose,
  onSaved,
}: {
  habit: Habit
  date: string
  /** Already logged today, shown so a second entry is an informed choice. */
  currentTotal: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const target = habit.measurable?.targetValue ?? 1
  const unit = habit.measurable?.unit ?? ''
  const [value, setValue] = useState(target)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    await logMeasurableEntry(habit.id, date, value)
    onSaved()
  }

  return (
    <Sheet
      title={habit.name}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          {currentTotal > 0 && (
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                await clearHabitLog(habit.id, date)
                onClose()
              }}
            >
              {t('habits.clearToday')}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 items-center py-2">
        {currentTotal > 0 && (
          <p className="text-xs text-[var(--stoa-text-muted)]">
            {t('habits.alreadyLoggedToday', { value: currentTotal, unit })}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={t('habits.decrease')}
            onClick={() => setValue((v) => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-full border border-[var(--stoa-border)] flex items-center justify-center active:scale-90 transition-transform"
          >
            <Minus size={20} strokeWidth={2.5} aria-hidden />
          </button>

          <div className="flex flex-col items-center min-w-[6rem]">
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Math.max(0, Number(e.target.value)))}
              className="font-display text-center text-3xl"
              aria-label={t('habits.value')}
            />
            {unit && <span className="text-xs text-[var(--stoa-text-muted)] mt-1">{unit}</span>}
          </div>

          <button
            type="button"
            aria-label={t('habits.increase')}
            onClick={() => setValue((v) => v + 1)}
            className="w-12 h-12 rounded-full border border-[var(--stoa-border)] flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus size={20} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <p className="text-xs text-[var(--stoa-text-muted)]">{t('habits.targetLabel', { value: target, unit })}</p>
      </div>
    </Sheet>
  )
}
