import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'
import { MAX_MUST_WINS, saveEveningReview } from '../../data/eveningReviews'
import { formatHumanDate, todayKey } from '../../lib/date'
import type { EveningReview } from '../../db/types'

/**
 * STOA-6 Part A — planning tomorrow, in one short sheet.
 *
 * Every field is optional except the must-wins, and even those aren't
 * individually required: the Save button only needs one of the three. The
 * point is that filing something takes under a minute; a form that has to
 * be completed correctly is a form that gets skipped on the nights it
 * matters most.
 *
 * Voice input is wired into the free-text fields via the existing
 * MicButton (Article 10's own component, feature-detected once centrally —
 * it renders nothing at all on a browser without speech support), because
 * this is exactly the kind of thing typed one-handed at the end of a day.
 */
export function EveningReviewSheet({
  spaceId,
  targetDate,
  initial,
  onClose,
}: {
  spaceId: string
  /** The day being planned — tomorrow, at the moment this is opened. */
  targetDate: string
  initial?: EveningReview
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? '')
  const [trainingPlan, setTrainingPlan] = useState(initial?.trainingPlan ?? '')
  const [warmUp, setWarmUp] = useState(initial?.warmUp ?? '')
  const [mustWins, setMustWins] = useState<string[]>(() => {
    const existing = initial?.mustWins ?? []
    return Array.from({ length: MAX_MUST_WINS }, (_, i) => existing[i] ?? '')
  })
  const [habitIdea, setHabitIdea] = useState(initial?.habitIdea ?? '')
  const [saving, setSaving] = useState(false)

  const canSave = mustWins.some((w) => w.trim())

  async function submit() {
    if (!canSave || saving) return
    setSaving(true)
    await saveEveningReview({ spaceId, date: targetDate, wakeTime, trainingPlan, warmUp, mustWins, habitIdea })
    onClose()
  }

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="evening-review-form" disabled={!canSave || saving}>
        {t('common.save')}
      </Button>
    </div>
  )

  return (
    // The sheet can now be opened for today as well as tomorrow (see
    // DashboardPage's PlanChip), so the title is derived from the date it
    // is actually editing rather than assuming tomorrow.
    <Sheet
      title={targetDate === todayKey() ? t('eveningReview.titleToday') : t('eveningReview.title')}
      onClose={onClose}
      footer={footer}
    >
      <form
        id="evening-review-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className="text-xs text-[var(--stoa-text-muted)]">
          {t('eveningReview.forDate', { date: formatHumanDate(targetDate, i18n.language) })}
        </p>

        <Field label={t('eveningReview.wakeTime')}>
          <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
        </Field>

        <Field label={t('eveningReview.trainingPlan')}>
          <div className="flex gap-2 items-start">
            <TextArea
              rows={2}
              placeholder={t('eveningReview.trainingPlanPlaceholder')}
              value={trainingPlan}
              onChange={(e) => setTrainingPlan(e.target.value)}
              className="flex-1"
            />
            <MicButton
              lang={i18n.language}
              onTranscript={(transcript) => setTrainingPlan((prev) => appendTranscript(prev, transcript))}
            />
          </div>
        </Field>

        <Field label={t('eveningReview.warmUp')}>
          <div className="flex gap-2 items-start">
            <TextArea
              rows={2}
              placeholder={t('eveningReview.warmUpPlaceholder')}
              value={warmUp}
              onChange={(e) => setWarmUp(e.target.value)}
              className="flex-1"
            />
            <MicButton
              lang={i18n.language}
              onTranscript={(transcript) => setWarmUp((prev) => appendTranscript(prev, transcript))}
            />
          </div>
        </Field>

        <Field label={t('eveningReview.mustWins')}>
          <div className="flex flex-col gap-2">
            {mustWins.map((win, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="text-xs text-[var(--stoa-text-muted)] w-4 shrink-0 tabular-nums">{index + 1}</span>
                <Input
                  placeholder={t('eveningReview.mustWinPlaceholder')}
                  value={win}
                  onChange={(e) => setMustWins((prev) => prev.map((w, i) => (i === index ? e.target.value : w)))}
                  className="flex-1"
                />
                <MicButton
                  lang={i18n.language}
                  onTranscript={(transcript) =>
                    setMustWins((prev) => prev.map((w, i) => (i === index ? appendTranscript(w, transcript) : w)))
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--stoa-text-muted)] mt-1.5">{t('eveningReview.mustWinsHint')}</p>
        </Field>

        {/* The brief's optional "habit idea" jot — folded into this same
            flow rather than given its own surface, since it's one more
            free-text line and nothing else. Deliberately not wired to
            habit creation: it's a note to self, and auto-creating habits
            from it would be the overbuilding the brief warns against. */}
        <Field label={t('eveningReview.habitIdea')}>
          <div className="flex gap-2 items-start">
            <TextArea
              rows={2}
              placeholder={t('eveningReview.habitIdeaPlaceholder')}
              value={habitIdea}
              onChange={(e) => setHabitIdea(e.target.value)}
              className="flex-1"
            />
            <MicButton
              lang={i18n.language}
              onTranscript={(transcript) => setHabitIdea((prev) => appendTranscript(prev, transcript))}
            />
          </div>
        </Field>
      </form>
    </Sheet>
  )
}
