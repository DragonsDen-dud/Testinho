import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { notificationPermissionState, requestNotificationPermission } from '../../lib/notify'
import { Field, Input } from '../ui/Input'
import { Button } from '../ui/Button'

export function RemindersSettingsSection() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const [permission, setPermission] = useState(notificationPermissionState())

  useEffect(() => {
    setPermission(notificationPermissionState())
  }, [])

  const quietHours = settings?.quietHours ?? { enabled: false, start: '22:00', end: '07:00' }
  const digest = settings?.morningDigest ?? { enabled: false, time: '08:00' }

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--stoa-border)] pt-4">
      <div className="text-sm font-semibold">{t('reminders.title')}</div>

      {permission !== 'granted' && (
        <div className="rounded-xl bg-[var(--stoa-surface)] border border-[var(--stoa-border)] px-3.5 py-2.5 text-xs flex items-center justify-between gap-2">
          <span>
            {permission === 'denied' ? t('reminders.notificationsBlocked') : t('reminders.enableNotifications')}
          </span>
          {permission !== 'denied' && permission !== 'unsupported' && (
            <Button
              variant="secondary"
              onClick={async () => {
                const result = await requestNotificationPermission()
                setPermission(result)
              }}
            >
              {t('reminders.enableNotifications')}
            </Button>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={quietHours.enabled}
          onChange={(e) => updateAppSettings({ quietHours: { ...quietHours, enabled: e.target.checked } })}
        />
        {t('reminders.quietHours')}
      </label>
      {quietHours.enabled && (
        <div className="flex flex-col gap-2 pl-1">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={quietHours.start}
              onChange={(e) => updateAppSettings({ quietHours: { ...quietHours, start: e.target.value } })}
              className="flex-1"
            />
            <span className="text-xs text-[var(--stoa-text-muted)]">{t('timeBlocks.to')}</span>
            <Input
              type="time"
              value={quietHours.end}
              onChange={(e) => updateAppSettings({ quietHours: { ...quietHours, end: e.target.value } })}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-[var(--stoa-text-muted)]">{t('reminders.quietHoursHint')}</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={digest.enabled}
          onChange={(e) => updateAppSettings({ morningDigest: { ...digest, enabled: e.target.checked } })}
        />
        {t('reminders.morningDigest')}
      </label>
      {digest.enabled && (
        <div className="flex flex-col gap-2 pl-1">
          <Field label={t('reminders.morningDigestTimeLabel')}>
            <Input
              type="time"
              value={digest.time}
              onChange={(e) => updateAppSettings({ morningDigest: { ...digest, time: e.target.value } })}
            />
          </Field>
          <p className="text-xs text-[var(--stoa-text-muted)]">{t('reminders.morningDigestHint')}</p>
        </div>
      )}
    </div>
  )
}
