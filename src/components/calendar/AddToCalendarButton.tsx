import { useTranslation } from 'react-i18next'
import { triggerIcsExport } from '../../lib/icsDownload'
import type { IcsBuildResult } from '../../lib/ics'

/** Article 13 — renders either the export action or, when the schedule
 * genuinely can't be mapped to a calendar recurrence, a plain explanation
 * of why not (never a silent guess). */
export function AddToCalendarButton({
  build,
  onExported,
}: {
  build: IcsBuildResult
  /** Article B.2 — State 5: called once the export actually happens, so a
   * caller (TodoForm) can persist a durable "this was exported" marker
   * (Todo.calendarExportedAt) for the list's persistent calendar tag. */
  onExported?: () => void
}) {
  const { t } = useTranslation()

  if (!build.ok) {
    const reasonKey =
      build.reason === 'unmappable_schedule'
        ? 'calendar.unmappableSchedule'
        : build.reason === 'no_reminder_times'
          ? 'calendar.noReminderTimes'
          : 'calendar.noDueDate'
    return <p className="text-xs text-[var(--stoa-text-muted)]">{t(reasonKey)}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="text-xs text-[var(--stoa-accent)] self-start underline underline-offset-2"
        onClick={() => {
          triggerIcsExport(build.filename, build.ics)
          onExported?.()
        }}
      >
        {t('calendar.addToCalendar')}
      </button>
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('calendar.oneWayHint')}</p>
      {/* Article B.4 — the hand-off is platform-dependent (share sheet vs.
       * a plain file download, see lib/shareOrDownload.ts) and neither
       * path is a single obvious action; this is the one-line clarification
       * so "I tapped it but nothing showed up in my Calendar" has an answer
       * before it happens, not after. */}
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('calendar.handoffHint')}</p>
    </div>
  )
}
