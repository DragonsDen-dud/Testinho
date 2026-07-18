import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DiagnosticEntry } from '../../db/types'
import { updateDiagnosticFeedback } from '../../data/diagnostics'
import { TextArea } from '../ui/Input'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'

/**
 * Article 12's Scheduled AI Report display, relocated here from a Dashboard
 * banner — the report now lives permanently on Analytics for its whole
 * period rather than appearing as a one-time popup on every app open.
 * "Viewing" it (see AnalyticsPage's mark-viewed effect) is what clears the
 * unviewed badge on the Analytics nav tab, so there's no dismiss button
 * here — the section just stays visible for the rest of the period,
 * exactly like DiagnosticDetailPage does for an older report.
 */
export function ScheduledReportCard({ title, report }: { title: string; report: DiagnosticEntry }) {
  const { t, i18n } = useTranslation()
  const [feedback, setFeedback] = useState(report.userFeedback ?? '')

  return (
    <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex flex-col gap-1.5">
      <span className="font-medium">{title}</span>
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
