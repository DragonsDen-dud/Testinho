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
import { ColorIconBadge } from '../ui/ColorIconBadge'
import { IconPicker } from '../ui/IconPicker'
import { suggestForHabitName } from '../../lib/iconSuggest'
import { MicButton } from '../ui/MicButton'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { useDomains } from '../../state/useDomains'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { useHabits } from '../../state/useHabits'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { createHabit, type NewHabitInput } from '../../data/habits'
import { mostRecentDomainId, defaultTimeBlockId } from '../../lib/quickCreateDefaults'
import { parseVoiceQuickCreate } from '../../lib/voiceQuickParse'
import { appendTranscript } from '../../lib/speechRecognition'
import { buildHabitIcs } from '../../lib/ics'
import { resolveHabitDomainStyle } from '../habits/HabitCategoryBadge'
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
  const styleMap = useCategoryStyleMap()

  const [name, setName] = useState('')
  const [domainId, setDomainId] = useState('')
  const [timeBlockId, setTimeBlockId] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [criticalReminder, setCriticalReminder] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [saved, setSaved] = useState<Habit | null>(null)
  // Habits 2.0 Part A follow-up — identical two-track behavior to the
  // full HabitForm: pre-selects the domain's current resolved icon and
  // keeps tracking it as the Domain field changes, until the user taps a
  // different icon in the picker, at which point `icon` is only ever
  // persisted (see submit()) if iconTouched — an untouched selection
  // stays undefined and keeps resolving from the domain forever, exactly
  // like a habit created before this round.
  const [icon, setIcon] = useState(() => resolveHabitDomainStyle(domainId, domains, styleMap).icon)
  const [iconTouched, setIconTouched] = useState(false)
  const [emoji, setEmoji] = useState<string | undefined>(undefined)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

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

  // domains/styleMap intentionally left out of the dependency array — see
  // the identical effect in HabitForm.tsx for why (only react to the
  // user/smart-default actually changing domainId, not to every
  // live-query tick).
  useEffect(() => {
    if (iconTouched) return
    setIcon(resolveHabitDomainStyle(domainId, domains, styleMap).icon)
  }, [domainId, iconTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  // Same name-based suggestion as the full form (lib/iconSuggest.ts). The
  // quick path is where a habit is most likely to be created without ever
  // opening the look picker, so it is the path that benefits most from the
  // default being right.
  useEffect(() => {
    if (iconTouched) return
    const hit = suggestForHabitName(name)
    if (!hit) return
    setIcon(hit.icon)
    setEmoji(hit.emoji)
  }, [name, iconTouched])

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
      icon: iconTouched ? icon : undefined,
      emoji,
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
      <Sheet
        title={t('quickCreate.savedTitle')}
        onClose={onClose}
        footer={<Button className="w-full" onClick={onClose}>{t('common.close')}</Button>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--stoa-text-muted)]">{t('quickCreate.savedBody', { name: saved.name })}</p>
          <AddToCalendarButton build={buildHabitIcs(saved)} />
        </div>
      </Sheet>
    )
  }

  const domainLabel = domains.find((d) => d.id === domainId)?.name
  const previewColor = resolveHabitDomainStyle(domainId, domains, styleMap).color

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="quick-create-habit-form" disabled={!name.trim()}>
        {t('common.save')}
      </Button>
    </div>
  )

  return (
    <Sheet title={t('habits.newHabit')} onClose={onClose} footer={footer}>
      <form
        id="quick-create-habit-form"
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

        <div className="flex flex-wrap gap-2 items-center">
          <Chip label={domainLabel ?? t('quickCreate.categoryPrompt')} selected={!!domainLabel} onClick={() => setMoreOpen(true)} />
          {reminderTime && <Chip label={t('quickCreate.timeChip', { time: reminderTime })} selected onClick={() => setMoreOpen(true)} />}
          {criticalReminder && <Chip label={t('quickCreate.calendarChip')} selected onClick={() => setMoreOpen(true)} />}
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--stoa-border)] bg-[var(--stoa-surface)] pl-1 pr-3 py-1 text-sm"
          >
            <ColorIconBadge color={previewColor} icon={icon} emoji={emoji} size="row" />
            {t('habits.icon')}
          </button>
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
      </form>

      {iconPickerOpen && (
        <Sheet title={t('habits.icon')} onClose={() => setIconPickerOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <ColorIconBadge color={previewColor} icon={icon} emoji={emoji} size="detail" />
            </div>
            <IconPicker
              value={icon}
              onChange={(next) => {
                setEmoji(undefined)
                setIcon(next)
                setIconTouched(true)
              }}
            />
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}
