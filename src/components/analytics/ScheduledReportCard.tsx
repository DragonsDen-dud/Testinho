import type { DiagnosticEntry } from '../../db/types'
import { FeedbackField } from '../diagnostics/FeedbackField'

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
  return (
    <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex flex-col gap-1.5">
      <span className="font-medium">{title}</span>
      <p className="whitespace-pre-wrap text-[var(--stoa-text)]">{report.aiInsight}</p>
      <FeedbackField key={report.id} entryId={report.id} initialValue={report.userFeedback ?? ''} />
    </div>
  )
}
