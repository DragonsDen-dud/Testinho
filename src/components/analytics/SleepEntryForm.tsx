import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { upsertSleepLog } from '../../data/sleep'
import { formatClockTime } from '../../lib/sleep'
import { todayKey } from '../../lib/date'
import type { SleepLog } from '../../db/types'

/**
 * One form for both logging a new night and editing an already-logged
 * date — passing `initial` pre-fills date/bedtime/wake-time from that row
 * and saving upserts by [spaceId+date] (data/sleep.ts), so re-opening an
 * existing date and changing a time updates that row instead of creating
 * a second one for the same date.
 */
export function SleepEntryForm({
  spaceId,
  initial,
  onClose,
  onSaved,
}: {
  spaceId: string
  initial?: SleepLog
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [date, setDate] = useState(initial?.date ?? todayKey())
  // 23:00/07:00 are just a sensible starting point to reduce friction on a
  // brand-new entry (mirrors HabitCard's measurable-entry default of the
  // habit's own target value rather than a blank field) — not a claim
  // about anyone's actual schedule.
  const [bedTime, setBedTime] = useState(initial ? formatClockTime(initial.bedTime) : '23:00')
  const [wakeTime, setWakeTime] = useState(initial ? formatClockTime(initial.wakeTime) : '07:00')

  async function submit() {
    if (!date || !bedTime || !wakeTime) return
    await upsertSleepLog(spaceId, date, bedTime, wakeTime)
    onSaved()
  }

  return (
    <Sheet
      title={initial ? t('sleep.editTitle') : t('sleep.newTitle')}
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={submit}>
          {t('common.save')}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('sleep.date')}>
          <Input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('sleep.bedTime')}>
            <Input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} required />
          </Field>
          <Field label={t('sleep.wakeTime')}>
            <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} required />
          </Field>
        </div>
        <p className="text-xs text-[var(--stoa-text-muted)]">{t('sleep.dateHint')}</p>
      </form>
    </Sheet>
  )
}
