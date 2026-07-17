import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { checkAiHealth } from '../../lib/aiClient'
import { Field, Input, Select } from '../ui/Input'
import type { ClaudeModelChoice } from '../../db/types'

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

export function AiSettingsSection() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const [apiKeyDraft, setApiKeyDraft] = useState(settings?.claudeApiKey ?? '')
  const [connectivity, setConnectivity] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    setApiKeyDraft(settings?.claudeApiKey ?? '')
  }, [settings?.claudeApiKey])

  useEffect(() => {
    let cancelled = false
    setConnectivity('checking')
    checkAiHealth().then((ok) => {
      if (!cancelled) setConnectivity(ok ? 'online' : 'offline')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' })
  function weekdayLabel(dow: number) {
    // 2024-01-07 is a Sunday, same anchor-date pattern used elsewhere in the app.
    return weekdayFormatter.format(new Date(2024, 0, 7 + dow))
  }

  const modelPref = settings?.aiModelPreference ?? { scheduledReport: 'haiku', freeformQuery: 'haiku' }
  const usageCount = settings?.aiUsage?.callCount ?? 0
  const showCaveat = !settings?.scheduledReportCaveatDismissed
  const weekReport = settings?.scheduledAiReport?.week
  const monthReport = settings?.scheduledAiReport?.month
  const defaultScheduledAiReport = { week: { enabled: true, dayOfWeek: 1 }, month: { enabled: true } }

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--stoa-border)] pt-4">
      <div className="text-sm font-semibold">{t('settings.aiSectionTitle')}</div>

      <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-xs">
        {t('settings.noFreeTierNotice')}
      </div>

      <Field label={t('settings.claudeApiKey')}>
        <Input
          type="password"
          placeholder={t('settings.claudeApiKeyPlaceholder')}
          value={apiKeyDraft}
          onChange={(e) => setApiKeyDraft(e.target.value)}
          onBlur={() => updateAppSettings({ claudeApiKey: apiKeyDraft.trim() || undefined })}
        />
      </Field>

      <div className="flex items-center justify-between text-xs text-[var(--stoa-text-muted)]">
        <span>{t('settings.aiUsageCount', { count: usageCount })}</span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`w-1.5 h-1.5 rounded-full ${
              connectivity === 'online'
                ? 'bg-[var(--stoa-accent)]'
                : connectivity === 'offline'
                  ? 'bg-[var(--stoa-danger)]'
                  : 'bg-[var(--stoa-text-muted)]'
            }`}
          />
          {t(`settings.connectivity_${connectivity}`)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('settings.modelForScheduledReport')}>
          <Select
            value={modelPref.scheduledReport}
            onChange={(e) =>
              updateAppSettings({
                aiModelPreference: { ...modelPref, scheduledReport: e.target.value as ClaudeModelChoice },
              })
            }
          >
            <option value="haiku">{t('settings.modelHaiku')}</option>
            <option value="sonnet">{t('settings.modelSonnet')}</option>
          </Select>
        </Field>
        <Field label={t('settings.modelForFreeformQuery')}>
          <Select
            value={modelPref.freeformQuery}
            onChange={(e) =>
              updateAppSettings({
                aiModelPreference: { ...modelPref, freeformQuery: e.target.value as ClaudeModelChoice },
              })
            }
          >
            <option value="haiku">{t('settings.modelHaiku')}</option>
            <option value="sonnet">{t('settings.modelSonnet')}</option>
          </Select>
        </Field>
      </div>

      {/* Article 12 — week and month cadences are independently toggleable, not one flag governing both. */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={weekReport?.enabled !== false}
          onChange={(e) =>
            updateAppSettings({
              scheduledAiReport: {
                ...defaultScheduledAiReport,
                ...settings?.scheduledAiReport,
                week: { ...defaultScheduledAiReport.week, ...weekReport, enabled: e.target.checked },
              },
            })
          }
        />
        {t('settings.scheduledReportWeekEnabled')}
      </label>

      {weekReport?.enabled !== false && (
        <Field label={t('settings.scheduledReportDayOfWeek')}>
          <Select
            value={String(weekReport?.dayOfWeek ?? 1)}
            onChange={(e) =>
              updateAppSettings({
                scheduledAiReport: {
                  ...defaultScheduledAiReport,
                  ...settings?.scheduledAiReport,
                  week: { ...defaultScheduledAiReport.week, ...weekReport, dayOfWeek: Number(e.target.value) },
                },
              })
            }
          >
            {WEEKDAY_KEYS.map((dow) => (
              <option key={dow} value={dow}>
                {weekdayLabel(dow)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={monthReport?.enabled !== false}
          onChange={(e) =>
            updateAppSettings({
              scheduledAiReport: {
                ...defaultScheduledAiReport,
                ...settings?.scheduledAiReport,
                month: { enabled: e.target.checked },
              },
            })
          }
        />
        {t('settings.scheduledReportMonthEnabled')}
      </label>

      {showCaveat && (
        <div className="rounded-xl bg-[var(--stoa-surface)] border border-[var(--stoa-border)] px-3.5 py-2.5 text-xs flex items-start justify-between gap-2">
          <span>{t('settings.scheduledReportCaveat')}</span>
          <button
            aria-label={t('common.close')}
            className="text-[var(--stoa-text-muted)] px-1 shrink-0"
            onClick={() => updateAppSettings({ scheduledReportCaveatDismissed: true })}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
