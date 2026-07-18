import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateAppSettings } from '../../state/useAppSettings'
import { buildBackupJson } from '../../lib/backup'
import { triggerBackupExport } from '../../lib/backupDownload'
import { todayKey, addDays } from '../../lib/date'

/**
 * Article 18 — "remind me later" snoozes to a fixed future date rather
 * than re-adding the interval to "now" each time it's dismissed, so
 * repeated snoozes on different days don't quietly drift the schedule.
 * No local dismissed state needed: both actions persist to AppSettings,
 * and the parent's isBackupReminderDue check (driven by the same live
 * settings) naturally stops rendering this once either takes effect.
 */
export function BackupReminderBanner({ intervalDays }: { intervalDays: number }) {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)

  // Article 23 — this banner's own one-tap export deliberately stays
  // "without photos": a quick, small, always-fast backup, matching the
  // banner's own low-friction nature. The full with/without-photos choice
  // (and its size warning) lives in Settings, for whoever actually wants
  // photos included in what they export.
  async function exportNow() {
    setExporting(true)
    try {
      const { json, filename } = await buildBackupJson(false)
      await triggerBackupExport(filename, json)
      await updateAppSettings({ lastBackupExportedAt: todayKey(), backupReminderSnoozedUntil: undefined })
    } finally {
      setExporting(false)
    }
  }

  async function remindLater() {
    await updateAppSettings({ backupReminderSnoozedUntil: addDays(todayKey(), intervalDays) })
  }

  return (
    <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex items-center justify-between gap-2">
      <span className="flex-1">{t('dashboard.backupReminder')}</span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          disabled={exporting}
          className="text-xs font-medium underline underline-offset-2"
          onClick={exportNow}
        >
          {t('settings.backupExport')}
        </button>
        <button type="button" className="text-xs text-[var(--stoa-text-muted)]" onClick={remindLater}>
          {t('dashboard.backupRemindLater')}
        </button>
      </div>
    </div>
  )
}
