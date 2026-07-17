import { useTranslation } from 'react-i18next'
import { useActiveReminderState } from '../../state/useReminderState'
import { snoozeReminder, dismissReminder } from '../../data/reminderActions'
import type { ReminderEntityType } from '../../db/types'

export function ActiveReminderRow({
  entityType,
  entityId,
  date,
}: {
  entityType: ReminderEntityType
  entityId: string
  date: string
}) {
  const { t } = useTranslation()
  const state = useActiveReminderState(entityType, entityId, date)
  if (!state) return null

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--stoa-text-muted)] -mt-1">
      <span>{t('reminders.activeReminderLabel')}</span>
      {!state.followUpSent && (
        <>
          <button
            className="underline underline-offset-2"
            onClick={() => snoozeReminder(entityType, entityId, date, 30)}
          >
            {t('reminders.snooze30')}
          </button>
          <button
            className="underline underline-offset-2"
            onClick={() => snoozeReminder(entityType, entityId, date, 60)}
          >
            {t('reminders.snooze60')}
          </button>
        </>
      )}
      <button className="underline underline-offset-2" onClick={() => dismissReminder(entityType, entityId, date)}>
        {t('reminders.dismiss')}
      </button>
    </div>
  )
}
