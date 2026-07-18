import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from '../../state/useAppSettings'
import { runFreeformQuery } from '../../data/aiReports'
import { Field, Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { Habit } from '../../db/types'

/** Article 16 freeform_query entry point — the habit edit sheet is the
 * closest thing this app has to a "habit detail screen". */
export function AskAiHabitPanel({ habit }: { habit: Habit }) {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const [question, setQuestion] = useState('')
  const [includeNorthStar, setIncludeNorthStar] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [answer, setAnswer] = useState('')
  const [errorCode, setErrorCode] = useState('')

  if (!settings?.claudeApiKey) {
    return (
      <Field label={t('habits.askAi')}>
        <p className="text-xs text-[var(--stoa-text-muted)]">{t('habits.askAiNoKey')}</p>
      </Field>
    )
  }

  async function ask() {
    if (!question.trim() || !settings?.activeSpaceId) return
    setStatus('loading')
    const result = await runFreeformQuery({
      spaceId: settings.activeSpaceId,
      habitId: habit.id,
      habitName: habit.name,
      question: question.trim(),
      includeNorthStar,
    })
    if (result.ok) {
      setAnswer(result.text)
      setStatus('done')
      // Article 16 — North Star is opt-in "for that specific call", so the
      // checkbox doesn't silently carry over and apply to the next question.
      setIncludeNorthStar(false)
    } else {
      // The friendly message alone previously discarded which of several
      // very different failure modes actually happened (blocked by the
      // proxy's origin check, a bad Anthropic key, rate-limited, a network
      // failure...) — shown alongside it now so a real failure is
      // diagnosable from the screen itself, not just from server logs.
      setErrorCode(result.error)
      setStatus('error')
    }
  }

  return (
    <Field label={t('habits.askAi')}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder={t('habits.askAiPlaceholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="secondary" disabled={!question.trim() || status === 'loading'} onClick={ask}>
            {t('habits.askAiSubmit')}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--stoa-text-muted)]">
          <input type="checkbox" checked={includeNorthStar} onChange={(e) => setIncludeNorthStar(e.target.checked)} />
          {t('habits.askAiIncludeNorthStar')}
        </label>
        {status === 'loading' && <p className="text-xs text-[var(--stoa-text-muted)]">{t('habits.askAiThinking')}</p>}
        {status === 'error' && (
          <p className="text-xs text-[var(--stoa-danger)]">
            {t('habits.askAiError')}
            {errorCode && <span className="text-[var(--stoa-text-muted)]"> ({errorCode})</span>}
          </p>
        )}
        {status === 'done' && <p className="text-sm whitespace-pre-wrap">{answer}</p>}
      </div>
    </Field>
  )
}
