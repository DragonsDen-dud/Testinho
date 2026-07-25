import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNeedsPwaRefresh, applyPwaUpdate } from '../../state/pwaUpdate'
import { fetchIncomingChangelogEntry } from '../../lib/pwaChangelog'
import type { ChangelogEntry } from '../../lib/changelog'

/**
 * Mounted once in AppShell, alongside UndoToast — the in-app alternative
 * to fully closing and reopening the app to pick up a new build.
 *
 * The needRefresh trigger/detection itself (state/pwaUpdate.ts) is
 * untouched by this round — this component only enriches its own content
 * once needRefresh flips true, by fetching the incoming build's changelog
 * entry (see lib/pwaChangelog.ts for why that has to be a network fetch
 * rather than reading this bundle's own compiled-in CHANGELOG). While
 * that fetch is in flight, and whenever it comes back empty (a hotfix
 * with nothing to report), the original generic "update available" text
 * is shown — never a blank or partial list.
 */
export function PwaUpdateBanner() {
  const { t } = useTranslation()
  const needRefresh = useNeedsPwaRefresh()
  const [entry, setEntry] = useState<ChangelogEntry | undefined>(undefined)

  useEffect(() => {
    if (!needRefresh) return
    let cancelled = false
    fetchIncomingChangelogEntry().then((result) => {
      if (!cancelled) setEntry(result)
    })
    return () => {
      cancelled = true
    }
  }, [needRefresh])

  if (!needRefresh) return null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-30 max-w-md w-[calc(100%-2rem)]">
      <div className="rounded-xl bg-[var(--stoa-text)] text-[var(--stoa-bg)] px-4 py-3 flex flex-col gap-2 shadow-lg">
        {entry ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('pwa.updateAvailableVersion', { version: entry.version })}</span>
            <ul className="text-xs opacity-90 list-disc pl-4 flex flex-col gap-0.5">
              {entry.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ) : (
          <span className="text-sm">{t('pwa.updateAvailable')}</span>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm font-medium underline-offset-2 underline shrink-0"
            onClick={applyPwaUpdate}
          >
            {t('pwa.refresh')}
          </button>
        </div>
      </div>
    </div>
  )
}
