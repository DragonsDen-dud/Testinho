import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { updateAppSettings } from '../../state/useAppSettings'
import { CHANGELOG } from '../../lib/changelog'

/**
 * Article 56 — non-blocking: it's a dismissible overlay, not a route, so
 * the screen underneath is already the normal app, not a gate in front of
 * it. Backdrop click, the × in the corner, and "Got it" are all treated as
 * the same acknowledgment — there's no version of "saw it but it should
 * come back" here, only "hasn't seen it yet" vs "has".
 */
export function WhatsNewSheet() {
  const { t } = useTranslation()
  const latest = CHANGELOG[0]

  function dismiss() {
    updateAppSettings({ lastSeenChangelogVersion: latest.version })
  }

  return (
    <Sheet
      title={t('whatsNew.title', { version: latest.version })}
      onClose={dismiss}
      footer={
        <Button className="w-full" onClick={dismiss}>
          {t('whatsNew.gotIt')}
        </Button>
      }
    >
      <ul className="flex flex-col gap-2 text-sm list-disc pl-4">
        {latest.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </Sheet>
  )
}
