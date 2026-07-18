import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { buildBackupJson, restoreFromBackupJson, estimatePhotoBackupSize, PHOTO_BACKUP_WARNING_BYTES } from '../../lib/backup'
import { triggerBackupExport, readFileAsText } from '../../lib/backupDownload'
import { todayKey, formatHumanDate } from '../../lib/date'
import { Button } from '../ui/Button'

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Article 18 — full-database export/import. Export clears any pending
 * backup reminder (Dashboard banner); import is destructive replace-all,
 * confirmed before running, and reloads the page afterward so every
 * in-memory hook re-reads from the restored database rather than trusting
 * stale state to reconcile itself.
 *
 * Article 23 — "with photos" vs "without photos" is an explicit checkbox,
 * not a silent default either way, with a real size estimate (not a fixed
 * warning message) shown the moment photos are included, so the size
 * warning lives in the export UI itself rather than only in documentation.
 */
export function BackupSection() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<'invalid_format' | 'unknown_table' | null>(null)
  const [exporting, setExporting] = useState(false)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [photoEstimate, setPhotoEstimate] = useState<{ photoCount: number; estimatedExportBytes: number } | null>(null)

  useEffect(() => {
    if (!includePhotos) {
      setPhotoEstimate(null)
      return
    }
    let cancelled = false
    estimatePhotoBackupSize().then((estimate) => {
      if (!cancelled) setPhotoEstimate(estimate)
    })
    return () => {
      cancelled = true
    }
  }, [includePhotos])

  const showSizeWarning = includePhotos && !!photoEstimate && photoEstimate.estimatedExportBytes > PHOTO_BACKUP_WARNING_BYTES

  async function handleExport() {
    setExporting(true)
    try {
      const { json, filename } = await buildBackupJson(includePhotos)
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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
        {t('settings.backupIncludePhotos')}
      </label>

      {includePhotos && photoEstimate && photoEstimate.photoCount > 0 && (
        <p className={`text-xs ${showSizeWarning ? 'text-[var(--stoa-danger)]' : 'text-[var(--stoa-text-muted)]'}`}>
          {showSizeWarning
            ? t('settings.backupPhotoSizeWarning', {
                count: photoEstimate.photoCount,
                size: formatMegabytes(photoEstimate.estimatedExportBytes),
              })
            : t('settings.backupPhotoSizeNote', {
                count: photoEstimate.photoCount,
                size: formatMegabytes(photoEstimate.estimatedExportBytes),
              })}
        </p>
      )}

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
