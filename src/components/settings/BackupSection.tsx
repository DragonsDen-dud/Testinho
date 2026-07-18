import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { buildBackupJson, restoreFromBackupJson } from '../../lib/backup'
import { triggerBackupExport, readFileAsText } from '../../lib/backupDownload'
import { todayKey, formatHumanDate } from '../../lib/date'
import { Button } from '../ui/Button'

/**
 * Article 18 — full-database export/import. Export clears any pending
 * backup reminder (Dashboard banner); import is destructive replace-all,
 * confirmed before running, and reloads the page afterward so every
 * in-memory hook re-reads from the restored database rather than trusting
 * stale state to reconcile itself.
 */
export function BackupSection() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<'invalid_format' | 'unknown_table' | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const { json, filename } = await buildBackupJson()
      await triggerBackupExport(filename, json)
      await updateAppSettings({ lastBackupExportedAt: todayKey(), backupReminderSnoozedUntil: undefined })
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(file: File) {
    setImportError(null)
    if (!confirm(t('settings.backupImportConfirm'))) return
    const json = await readFileAsText(file)
    const result = await restoreFromBackupJson(json)
    if (!result.ok) {
      setImportError(result.reason)
      return
    }
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--stoa-border)] pt-4">
      <div className="text-sm font-semibold">{t('settings.backupSectionTitle')}</div>
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('settings.backupApiKeyNotice')}</p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--stoa-text-muted)]">
          {settings?.lastBackupExportedAt
            ? t('settings.backupLastExported', { date: formatHumanDate(settings.lastBackupExportedAt, i18n.language) })
            : t('settings.backupNeverExported')}
        </span>
        <Button variant="secondary" disabled={exporting} onClick={handleExport}>
          {t('settings.backupExport')}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) handleImportFile(file)
          }}
        />
        <Button variant="danger" onClick={() => fileInputRef.current?.click()}>
          {t('settings.backupImport')}
        </Button>
        <p className="text-xs text-[var(--stoa-text-muted)]">{t('settings.backupImportHint')}</p>
        {importError && <p className="text-xs text-[var(--stoa-danger)]">{t(`settings.backupImportError_${importError}`)}</p>}
      </div>
    </div>
  )
}
