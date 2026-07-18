import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DiagnosticEntry } from '../../db/types'
import { updateDiagnosticFeedback } from '../../data/diagnostics'
import { TextArea } from '../ui/Input'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'

/**
 * Article 12 report banner, shared between week/month scopes on Dashboard.
 * Also the Article 10 target surface for DiagnosticEntry.userFeedback — no
 * UI wrote to that field before this pass, so the feedback textarea below
 * the report text is new scaffolding, not a pre-existing field being wired up.
 */
export function ScheduledReportBanner({
  title,
  report,
  onDismiss,
}: {
  title: string
  report: DiagnosticEntry
  onDismiss: () => void
}) {
  const { t, i18n } = useTranslation()
  const [feedback, setFeedback] = useState(report.userFeedback ?? '')

  return (
    <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{title}</span>
        <button
          aria-label={t('common.close')}
          className="text-[var(--stoa-text-muted)] px-1 shrink-0"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[var(--stoa-text)]">{report.aiInsight}</p>
      <div className="flex gap-2 items-start mt-1">
        <TextArea
          rows={1}
          placeholder={t('dashboard.reportFeedbackPlaceholder')}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onBlur={() => updateDiagnosticFeedback(report.id, feedback.trim())}
          className="flex-1 text-xs py-1.5"
        />
        <MicButton
          lang={i18n.language}
          onTranscript={(transcript) =>
            setFeedback((prev) => {
              const merged = appendTranscript(prev, transcript)
              void updateDiagnosticFeedback(report.id, merged.trim())
              return merged
            })
          }
        />
      </div>
    </div>
  )
}
