import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { useSpaces } from '../state/useSpaces'
import { Select } from '../components/ui/Input'
import type { Language, ThemePreset } from '../db/types'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaces = useSpaces()

  async function setLanguage(lang: Language) {
    await updateAppSettings({ language: lang })
    await i18n.changeLanguage(lang)
  }

  async function setTheme(preset: ThemePreset) {
    await updateAppSettings({ theme: { ...settings?.theme, preset } })
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-5">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('settings.language')}</label>
        <Select value={settings?.language ?? 'en'} onChange={(e) => setLanguage(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('settings.theme')}</label>
        <Select
          value={settings?.theme.preset ?? 'system'}
          onChange={(e) => setTheme(e.target.value as ThemePreset)}
        >
          <option value="system">{t('settings.themeSystem')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="contrast">{t('settings.themeContrast')}</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('settings.activeSpace')}</label>
        <Select
          value={settings?.activeSpaceId ?? ''}
          onChange={(e) => updateAppSettings({ activeSpaceId: e.target.value })}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </Select>
      </div>

      <button
        className="text-left text-sm py-2.5 border-t border-[var(--stoa-border)]"
        onClick={() => navigate('/settings/spaces')}
      >
        {t('settings.manageSpaces')} →
      </button>
      <button
        className="text-left text-sm py-2.5 border-t border-[var(--stoa-border)]"
        onClick={() => navigate('/settings/domains')}
      >
        {t('settings.manageDomains')} →
      </button>
      <button
        className="text-left text-sm py-2.5 border-t border-[var(--stoa-border)]"
        onClick={() => navigate('/settings/time-blocks')}
      >
        {t('settings.manageTimeBlocks')} →
      </button>
      <button
        className="text-left text-sm py-2.5 border-t border-[var(--stoa-border)]"
        onClick={() => navigate('/settings/trash')}
      >
        {t('settings.manageTrash')} →
      </button>

      <div className="border-t border-[var(--stoa-border)] pt-4 text-xs text-[var(--stoa-text-muted)]">
        <div className="font-medium mb-1">{t('settings.about')}</div>
        <p>{t('settings.aboutText')}</p>
      </div>
    </div>
  )
}
