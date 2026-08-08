import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button } from '../ui/Button'
import { shareOrDownloadFile } from '../../lib/shareOrDownload'
import {
  BRIEF_HEIGHT,
  BRIEF_WIDTH,
  briefCanvasToPngBlob,
  pickBriefLineKey,
  renderMorningBrief,
} from '../../lib/morningBrief'
import { formatHumanDate } from '../../lib/date'
import type { EveningReview } from '../../db/types'

/**
 * STOA-6 Part B — the Daily Brief, shown on Today whenever last night's
 * Evening Review was filed for today.
 *
 * The canvas on screen *is* the image that gets saved: `renderMorningBrief`
 * paints this element, and Save encodes that same element. There is no
 * separate export layout that could drift from what Denys is looking at.
 *
 * GENERATE ON OPEN, NOT ON A SCHEDULE. This renders in an effect when the
 * component mounts — i.e. the next time the app is opened on a day that has
 * a review waiting. STOA is a client-side PWA with no backend (Article 4)
 * and its notification delivery is explicitly foreground-only (the scope
 * note under Article 42), so there is no mechanism that could reliably
 * produce this at a fixed hour while the app is closed. See the round
 * report for what a genuinely scheduled version would require.
 */
export function MorningBriefCard({ review, spaceName }: { review: EveningReview; spaceName: string }) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      renderMorningBrief(canvas, {
        dateLine: formatHumanDate(review.date, i18n.language),
        greeting: t('morningBrief.greeting'),
        wakeLabel: t('eveningReview.wakeTime'),
        wakeTime: review.wakeTime,
        trainingLabel: t('eveningReview.trainingPlan'),
        trainingPlan: review.trainingPlan,
        warmUpLabel: t('eveningReview.warmUp'),
        warmUp: review.warmUp,
        mustWinsLabel: t('eveningReview.mustWins'),
        mustWins: review.mustWins,
        closingLine: t(pickBriefLineKey(review.date)),
        footer: spaceName,
      })
    } catch {
      // A canvas that won't paint is not worth crashing Today over — the
      // card simply stays blank and Save reports the failure below.
      setStatus(t('morningBrief.renderError'))
    }
  }, [review, spaceName, i18n.language, t])

  async function save() {
    const canvas = canvasRef.current
    if (!canvas || saving) return
    setSaving(true)
    setStatus(null)
    try {
      const blob = await briefCanvasToPngBlob(canvas)
      const file = new File([blob], `stoa-brief-${review.date}.png`, { type: 'image/png' })
      const outcome = await shareOrDownloadFile(file)
      if (outcome !== 'cancelled') setStatus(t(`morningBrief.saved_${outcome}`))
    } catch {
      setStatus(t('morningBrief.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide px-1">
        {t('morningBrief.section')}
      </h2>
      <canvas
        ref={canvasRef}
        // Intrinsic size is set by the renderer (logical size × DPR); this
        // only controls layout, so the card scales to the column width
        // while staying crisp on a high-DPI screen.
        style={{ width: '100%', aspectRatio: `${BRIEF_WIDTH} / ${BRIEF_HEIGHT}` }}
        className="rounded-card block"
        role="img"
        aria-label={t('morningBrief.imageAlt')}
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="flex-1" onClick={save} disabled={saving}>
          <span className="inline-flex items-center gap-1.5 justify-center">
            <Download size={15} strokeWidth={1.75} aria-hidden />
            {t('morningBrief.save')}
          </span>
        </Button>
      </div>
      {status && <p className="text-xs text-[var(--stoa-text-muted)] px-1">{status}</p>}
    </section>
  )
}
