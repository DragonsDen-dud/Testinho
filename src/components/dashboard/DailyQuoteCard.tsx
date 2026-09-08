import { useTranslation } from 'react-i18next'
import type { Quote } from '../../db/types'

/**
 * One of the user's own quotes, on Today.
 *
 * ARTICLE 19 governs how this looks, and it is a real constraint rather
 * than a style note. The tone rule bans motivational slogans and staged
 * enthusiasm from STOA's own voice — so the app adds nothing around the
 * line: no heading urging you on, no emoji, no exclamation, no "quote of
 * the day" fanfare, no card that competes with the habits underneath it.
 * A quiet rule, the line, and the attribution.
 *
 * It renders nothing at all when the user has no quotes, the same silent
 * skip the Daily Brief uses on an unplanned day. STOA never seeds one of
 * its own to fill the space (Article 1).
 */
export function DailyQuoteCard({ quote }: { quote: Quote }) {
  const { t } = useTranslation()
  return (
    <figure
      className="border-l-2 pl-3.5 py-0.5"
      style={{ borderColor: 'var(--stoa-border)' }}
      aria-label={t('quotes.title')}
    >
      <blockquote className="text-sm leading-relaxed text-[var(--stoa-text)] break-words">
        {quote.text}
      </blockquote>
      {(quote.author || quote.source) && (
        <figcaption className="text-xs text-[var(--stoa-text-muted)] mt-1.5 break-words">
          {[quote.author, quote.source].filter(Boolean).join(' · ')}
        </figcaption>
      )}
    </figure>
  )
}
