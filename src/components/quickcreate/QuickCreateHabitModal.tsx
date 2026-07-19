// Part 1 — compact quick-create for Habit. Calls the exact same
// createHabit() the full HabitForm uses; this only pre-populates fewer
// visible fields and applies the smart defaults below as real default
// values, not a separate/thinner code path (same rule as Article 49's FAB
// itself: always through the real full flow).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { MicButton } from '../ui/MicButton'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { useDomains } from '../../state/useDomains'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { useHabits } from '../../state/useHabits'
import { createHabit, type NewHabitInput } from '../../data/habits'
import { mostRecentDomainId, defaultTimeBlockId } from '../../lib/quickCreateDefaults'
import { parseVoiceQuickCreate } from '../../lib/voiceQuickParse'
import { appendTranscript } from '../../lib/speechRecognition'
import { buildHabitIcs } from '../../lib/ics'
import type { Habit } from '../../db/types'

export function QuickCreateHabitModal({
  spaceId,
  onClose,
  onOpenFullEditor,
}: {
  spaceId: string
  onClose: () => void
  onOpenFullEditor: (initialTitle: string) => void
}) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(spaceId)
  const timeBlocks = useTimeBlocks(spaceId)
  const habits = useHabits(spaceId)

  const [name, setName] = useState('')
  const [domainId, setDomainId] = useState('')
  const [timeBlockId, setTimeBlockId] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [criticalReminder, setCriticalReminder] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [saved, setSaved] = useState<Habit | null>(null)

  // useDomains/useTimeBlocks/useHabits are Dexie live queries: they start
  // out empty and resolve asynchronously, one tick after this component's
  // first render. Applying the smart default in a plain useMemo on mount
  // would race that resolution and silently capture "no data yet" as the
  // default. These effects instead apply the default the first moment
  // real (non-empty) data is observed, then stop — "current time of day"
  // still means the moment the quick-create was opened, not a live clock.
  const domainDefaultApplied = useRef(false)
  useEffect(() => {
    if (domainDefaultApplied.current || habits.length === 0) return
    domainDefaultApplied.current = true
    setDomainId(mostRecentDomainId(habits) ?? '')
  }, [habits])

  const timeBlockDefaultApplied = useRef(false)
  useEffect(() => {
    if (timeBlockDefaultApplied.current || timeBlocks.length === 0) return
    timeBlockDefaultApplied.current = true
    setTimeBlockId(defaultTimeBlockId(timeBlocks) ?? '')
  }, [timeBlocks])

  function handleTranscript(transcript: string) {
    const result = parseVoiceQuickCreate(transcript, domains)
    setName((prev) => (prev.trim() ? appendTranscript(prev, result.title) : result.title))
    // Habits have no due-date concept — only the time-of-day portion of a
    // spoken phrase maps onto anything real for them (a reminder time);
    // a parsed day (tomorrow/next Tuesday) is silently not applicable here.
    if (result.domain) setDomainId(result.domain.id)
    if (result.scheduledTime) setReminderTime(result.scheduledTime)
    if (result.calendarIntent) setCriticalReminder(true)
    if (result.domain || result.scheduledTime || result.calendarIntent) setMoreOpen(true)
  }

  async function submit() {
    if (!name.trim()) return
    const data: NewHabitInput = {
      spaceId,
      name: name.trim(),
      habitType: 'build',
      domainId: domainId || undefined,
      timeBlockId: timeBlockId || undefined,
      schedule: { type: 'daily', params: {} },
      reminderTimes: reminderTime ? [reminderTime] : [],
      criticalReminder,
    }
    const habit = await createHabit(data)
    if (criticalReminder) {
      setSaved(habit)
    } else {
      onClose()
    }
  }

  if (saved) {
    return (
      <Sheet title={t('quickCreate.savedTitle')} onClose={onClose}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--stoa-text-muted)]">{t('quickCreate.savedBody', { name: saved.name })}</p>
          <AddToCalendarButton build={buildHabitIcs(saved)} />
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </Sheet>
    )
  }

  const domainLabel = domains.find((d) => d.id === domainId)?.name

  return (
    <Sheet title={t('habits.newHabit')} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex gap-2 items-center">
          <Input
            autoFocus
            placeholder={t('habits.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            required
          />
          <MicButton lang={i18n.language} onTranscript={handleTranscript} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip label={domainLabel ?? t('quickCreate.categoryPrompt')} selected={!!domainLabel} onClick={() => setMoreOpen(true)} />
          {reminderTime && <Chip label={t('quickCreate.timeChip', { time: reminderTime })} selected onClick={() => setMoreOpen(true)} />}
          {criticalReminder && <Chip label={t('quickCreate.calendarChip')} selected onClick={() => setMoreOpen(true)} />}
        </div>

        <button
          type="button"
          className="text-xs text-[var(--stoa-accent)] self-start"
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? t('quickCreate.hideDetails') : t('quickCreate.moreDetails')}
        </button>

        {moreOpen && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('habits.domain')}>
                <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('habits.timeBlock')}>
                <Select value={timeBlockId} onChange={(e) => setTimeBlockId(e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {timeBlocks.map((tb) => (
                    <option key={tb.id} value={tb.id}>
                      {tb.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t('habits.reminderTimes')}>
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={criticalReminder} onChange={(e) => setCriticalReminder(e.target.checked)} />
              {t('habits.criticalReminder')}
            </label>
          </div>
        )}

        <button
          type="button"
          className="text-xs text-[var(--stoa-text-muted)] underline underline-offset-2 self-start"
          onClick={() => onOpenFullEditor(name)}
        >
          {t('quickCreate.openFullEditor')}
        </button>

        <div className="flex gap-2 justify-end mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
