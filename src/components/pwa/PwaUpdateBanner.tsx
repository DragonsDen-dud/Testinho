import { useTranslation } from 'react-i18next'
import { useNeedsPwaRefresh, applyPwaUpdate } from '../../state/pwaUpdate'

/** Mounted once in AppShell, alongside UndoToast — the in-app alternative
 * to fully closing and reopening the app to pick up a new build. */
export function PwaUpdateBanner() {
  const { t } = useTranslation()
  const needRefresh = useNeedsPwaRefresh()

  if (!needRefresh) return null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-30 max-w-md w-[calc(100%-2rem)]">
      <div className="rounded-xl bg-[var(--stoa-text)] text-[var(--stoa-bg)] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <span className="text-sm">{t('pwa.updateAvailable')}</span>
        <button
          type="button"
          className="text-sm font-medium underline-offset-2 underline shrink-0"
          onClick={applyPwaUpdate}
        >
          {t('pwa.refresh')}
        </button>
      </div>
    </div>
  )
}
