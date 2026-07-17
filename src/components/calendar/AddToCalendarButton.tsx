import { useTranslation } from 'react-i18next'
import { triggerIcsExport } from '../../lib/icsDownload'
import type { IcsBuildResult } from '../../lib/ics'

/** Article 13 — renders either the export action or, when the schedule
 * genuinely can't be mapped to a calendar recurrence, a plain explanation
 * of why not (never a silent guess). */
export function AddToCalendarButton({ build }: { build: IcsBuildResult }) {
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
        onClick={() => triggerIcsExport(build.filename, build.ics)}
      >
        {t('calendar.addToCalendar')}
      </button>
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('calendar.oneWayHint')}</p>
    </div>
  )
}
