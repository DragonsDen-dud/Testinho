import { useTranslation } from 'react-i18next'
import { useToast, dismissToast } from '../../state/toast'

/** Article 50 — mounted once in AppShell, so it's reachable from every
 * screen a delete action can happen on. */
export function UndoToast() {
  const { t } = useTranslation()
  const toast = useToast()

  if (!toast) return null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-30 max-w-md w-[calc(100%-2rem)]">
      <div className="rounded-xl bg-[var(--stoa-text)] text-[var(--stoa-bg)] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <span className="text-sm">{toast.message}</span>
        <button
          type="button"
          className="text-sm font-medium underline-offset-2 underline shrink-0"
          onClick={() => {
            toast.onUndo()
            dismissToast()
          }}
        >
          {t('common.undo')}
        </button>
      </div>
    </div>
  )
}
