import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
 *
 * Catch-up round — collapsible: with both a weekly and monthly report able
 * to render at once, each with a full AI paragraph plus a feedback
 * textarea, this was pushing the actual charts below the fold. Reuses
 * TaskCard's existing expand/collapse chevron pattern (the only disclosure
 * pattern already in the app) rather than inventing a new one. Defaults to
 * collapsed and does NOT persist across sessions/reloads — no new
 * AppSettings field for this, since each report is only ever "new" once
 * per period anyway (see the unviewed nav badge, which already solves
 * "did I see this"); collapsed-by-default just keeps the initial page load
 * calm. Purely a show/hide toggle — the report content, generation, and
 * feedback-saving logic are all untouched.
 */
export function ScheduledReportCard({ title, report }: { title: string; report: DiagnosticEntry }) {
  const [expanded, setExpanded] = useState(false)
  const teaser = report.aiInsight?.split('\n')[0] ?? ''

  return (
    <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex flex-col gap-1.5">
      <button
        type="button"
        className="flex items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-medium">{title}</span>
        {expanded ? (
          <ChevronDown size={16} className="text-[var(--stoa-text-muted)] shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={16} className="text-[var(--stoa-text-muted)] shrink-0" aria-hidden />
        )}
      </button>
      {expanded ? (
        <>
          <p className="whitespace-pre-wrap text-[var(--stoa-text)]">{report.aiInsight}</p>
          <FeedbackField key={report.id} entryId={report.id} initialValue={report.userFeedback ?? ''} />
        </>
      ) : (
        <p className="truncate text-[var(--stoa-text-muted)]">{teaser}</p>
      )}
    </div>
  )
}
