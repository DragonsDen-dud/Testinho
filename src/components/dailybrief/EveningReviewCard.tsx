import { useTranslation } from 'react-i18next'
import { MoonStar, Check } from 'lucide-react'
import type { EveningReview } from '../../db/types'

/**
 * STOA-6 Part A — the entry point, on Today.
 *
 * Timing lives in lib/eveningPrompt.ts, not here.
 *
 * Placement rationale (a disclosed judgment call): Today is the only screen
 * Denys reliably opens daily, and the evening review is a daily act, so a
 * new tab would be a whole navigation destination for a once-a-day, 40-second
 * task. It appears from 17:00 and disappears once tomorrow is planned —
 * replaced by a quiet confirmation row rather than vanishing silently, so
 * "did I already do this?" is answerable at a glance and editable in one tap.
 *
 * Article 19 tone: states what's there, asks once, never nags.
 */
export function EveningReviewCard({
  review,
  onOpen,
}: {
  /** Tomorrow's review, if one is already filed. */
  review: EveningReview | undefined
  onOpen: () => void
}) {
  const { t } = useTranslation()

  if (review && review.mustWins.length > 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left rounded-card bg-canvas px-3.5 py-2.5 flex items-center gap-2.5"
      >
        <Check size={16} strokeWidth={2} aria-hidden className="text-[var(--stoa-accent)] shrink-0" />
        <span className="flex-1 min-w-0 text-sm text-[var(--stoa-text)]">
          {t('eveningReview.plannedCount', { count: review.mustWins.length })}
        </span>
        <span className="text-xs text-[var(--stoa-text-muted)] shrink-0">{t('common.edit')}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-card px-3.5 py-3 flex items-center gap-2.5 border border-[var(--stoa-border)]"
    >
      <MoonStar size={18} strokeWidth={1.75} aria-hidden className="text-[var(--stoa-text-muted)] shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-[var(--stoa-text)]">{t('eveningReview.promptTitle')}</span>
        <span className="block text-xs text-[var(--stoa-text-muted)]">{t('eveningReview.promptSubtitle')}</span>
      </span>
    </button>
  )
}
