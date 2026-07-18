import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { updateDiagnosticFeedback } from '../data/diagnostics'
import { formatHumanDate } from '../lib/date'
import { TextArea } from '../components/ui/Input'
import { MicButton } from '../components/ui/MicButton'
import { EmptyState } from '../components/ui/EmptyState'
import { appendTranscript } from '../lib/speechRecognition'

/**
 * Article 48 — search needs a real destination for a DiagnosticEntry
 * result. No screen showed one before this: Dashboard only ever surfaces
 * the *current* period's report banner, so anything older was previously
 * unreachable once the next period rotated in. This is new scope, not a
 * pre-existing screen being wired up.
 */
export function DiagnosticDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const entry = useLiveQuery(() => (id ? db.diagnosticEntries.get(id) : undefined), [id])
  const [feedback, setFeedback] = useState<string | null>(null)

  const feedbackValue = feedback ?? entry?.userFeedback ?? ''

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)] self-start">
        ← {t('common.back')}
      </button>

      {!entry ? (
        <EmptyState text={t('diagnostics.notFound')} />
      ) : (
        <>
          <div>
            <h1 className="text-lg font-semibold">
              {t(entry.scope === 'week' ? 'dashboard.scheduledReportTitleWeek' : 'dashboard.scheduledReportTitleMonth')}
            </h1>
            <p className="text-xs text-[var(--stoa-text-muted)]">
              {formatHumanDate(entry.periodStart, i18n.language)} – {formatHumanDate(entry.periodEnd, i18n.language)}
            </p>
          </div>

          {entry.aiInsight ? (
            <p className="whitespace-pre-wrap text-sm rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5">
              {entry.aiInsight}
            </p>
          ) : (
            <EmptyState text={t('diagnostics.noInsightYet')} />
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2 items-start">
              <TextArea
                rows={2}
                placeholder={t('dashboard.reportFeedbackPlaceholder')}
                value={feedbackValue}
                onChange={(e) => setFeedback(e.target.value)}
                onBlur={() => updateDiagnosticFeedback(entry.id, feedbackValue.trim())}
                className="flex-1 text-sm"
              />
              <MicButton
                lang={i18n.language}
                onTranscript={(transcript) => {
                  const merged = appendTranscript(feedbackValue, transcript)
                  setFeedback(merged)
                  void updateDiagnosticFeedback(entry.id, merged.trim())
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
