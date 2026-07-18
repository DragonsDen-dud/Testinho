import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateDiagnosticFeedback } from '../../data/diagnostics'
import { TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'

/**
 * Article 10/12 — the DiagnosticEntry.userFeedback editor, shared by
 * ScheduledReportCard (Analytics) and DiagnosticDetailPage (an older report
 * reached via search) so there's exactly one implementation of the
 * explicit-save behavior, not two copies that could drift apart.
 *
 * Persistence is Save-button-only: neither typing nor a voice transcript
 * commits anything by itself — both just update the local draft. The Save
 * button is the actual mechanism, not a decorative addition on top of an
 * autosave that was already happening (the previous onBlur-based autosave
 * is gone, not left running alongside this).
 *
 * Pass `key={entryId}` from the caller — this component's internal
 * "unsaved edit" state must reset when it's handed a different entry
 * (e.g. navigating from one DiagnosticDetailPage to another), and a plain
 * prop change wouldn't do that on its own.
 */
export function FeedbackField({ entryId, initialValue }: { entryId: string; initialValue: string }) {
  const { t, i18n } = useTranslation()
  const [feedback, setFeedback] = useState(initialValue)
  const [lastSaved, setLastSaved] = useState(initialValue)
  const [justSaved, setJustSaved] = useState(false)
  const isDirty = feedback.trim() !== lastSaved

  function updateDraft(next: string) {
    setFeedback(next)
    setJustSaved(false)
  }

  async function handleSave() {
    const trimmed = feedback.trim()
    await updateDiagnosticFeedback(entryId, trimmed)
    setLastSaved(trimmed)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1600)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 items-start">
        <TextArea
          rows={2}
          placeholder={t('dashboard.reportFeedbackPlaceholder')}
          value={feedback}
          onChange={(e) => updateDraft(e.target.value)}
          className="flex-1 text-sm"
        />
        <MicButton lang={i18n.language} onTranscript={(transcript) => updateDraft(appendTranscript(feedback, transcript))} />
      </div>
      <div className="flex items-center justify-end gap-2">
        {justSaved && !isDirty && <span className="text-xs text-[var(--stoa-text-muted)]">{t('common.saved')}</span>}
        <Button type="button" variant="secondary" disabled={!isDirty} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
