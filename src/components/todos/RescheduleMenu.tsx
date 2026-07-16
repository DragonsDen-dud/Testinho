import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { addDays, todayKey } from '../../lib/date'

/** Article 30 — Tomorrow / In a week / Pick a date. Not a free date-picker-only flow. */
export function RescheduleMenu({ onReschedule }: { onReschedule: (newDueDate: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {t('todos.reschedule')}
      </Button>
    )
  }

  if (pickingDate) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Input
          type="date"
          min={todayKey()}
          autoFocus
          value={dateDraft}
          onChange={(e) => setDateDraft(e.target.value)}
        />
        <Button
          disabled={!dateDraft}
          onClick={() => {
            onReschedule(dateDraft)
            setOpen(false)
            setPickingDate(false)
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="secondary"
        onClick={() => {
          onReschedule(addDays(todayKey(), 1))
          setOpen(false)
        }}
      >
        {t('todos.rescheduleTomorrow')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          onReschedule(addDays(todayKey(), 7))
          setOpen(false)
        }}
      >
        {t('todos.rescheduleInAWeek')}
      </Button>
      <Button variant="secondary" onClick={() => setPickingDate(true)}>
        {t('todos.reschedulePickDate')}
      </Button>
      <button
        type="button"
        className="text-xs text-[var(--stoa-text-muted)]"
        onClick={() => setOpen(false)}
      >
        {t('common.cancel')}
      </button>
    </div>
  )
}
