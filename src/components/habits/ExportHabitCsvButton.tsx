import { useTranslation } from 'react-i18next'
import { useHabitLogs } from '../../state/useHabits'
import { buildHabitLogCsv } from '../../lib/csv'
import { triggerCsvExport } from '../../lib/csvDownload'
import type { Habit } from '../../db/types'

/** Article 55 — exports this Habit's full HabitLog history as CSV. Always
 * available once a habit exists (even with zero logs yet, which just
 * exports headers only) — unlike Article 13's calendar export, there's no
 * schedule-mapping gap here that would make the export impossible. */
export function ExportHabitCsvButton({ habit }: { habit: Habit }) {
  const { t } = useTranslation()
  const logs = useHabitLogs(habit.id)

  return (
    <button
      type="button"
      className="text-xs text-[var(--stoa-accent)] self-start underline underline-offset-2"
      onClick={() => {
        const { csv, filename } = buildHabitLogCsv(habit, logs)
        triggerCsvExport(filename, csv)
      }}
    >
      {t('habits.exportCsv')}
    </button>
  )
}
