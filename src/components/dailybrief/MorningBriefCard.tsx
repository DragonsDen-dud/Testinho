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
import { SectionHeader } from '../ui/SectionHeader'
import { BRIEF_EXPANDED_PREF, readUiPref, writeUiPref } from '../../lib/uiPrefs'
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

  // COLLAPSIBLE, AND COLLAPSED BY DEFAULT.
  //
  // The brief is a 720×900 image — on a phone column that is roughly 450px
  // tall, which pushed the habit grid most of a screen down on any day a
  // review existed. Today's job is the day's habits; the brief is reference
  // material for it.
  //
  // What makes collapsing honest rather than just hiding the feature: the
  // collapsed state still shows the must-wins as real text, which is the
  // actual content of the brief. Nothing is lost by leaving it shut — the
  // image is the shareable artifact, not the information. The choice is
  // remembered per device, so anyone who wants it open keeps it open.
  const [expanded, setExpanded] = useState(() => readUiPref(BRIEF_EXPANDED_PREF, false))
  function toggle() {
    setExpanded((prev) => {
      writeUiPref(BRIEF_EXPANDED_PREF, !prev)
      return !prev
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    // Nothing to paint while collapsed — the canvas isn't mounted. The
    // effect re-runs on expand because `expanded` is a dependency, so the
    // image is drawn the first time it is actually needed rather than on
    // every Today open.
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
  }, [review, spaceName, i18n.language, t, expanded])

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
      <SectionHeader
        title={t('morningBrief.section')}
        expanded={expanded}
        onToggle={toggle}
        controls="morning-brief-body"
      />

      <div id="morning-brief-body" className="flex flex-col gap-2">
        {/* The must-wins in text form — collapsing hides the image, not the
            day's three things, so nothing is actually lost by leaving the
            section shut.

            Only while collapsed, though: the brief image already renders
            the same three lines, and showing both at once printed the
            day's must-wins twice within 400px of each other. Collapsed is
            the text density, expanded is the image density. */}
        {!expanded && review.mustWins.length > 0 && (
          <ol className="flex flex-col gap-1.5 rounded-card bg-canvas px-3.5 py-3">
            {review.mustWins.map((win, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--stoa-text)]">
                <span
                  aria-hidden
                  className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[var(--stoa-accent-soft)] text-[10px] font-medium flex items-center justify-center tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 break-words">{win}</span>
              </li>
            ))}
          </ol>
        )}

        {expanded && (
          <>
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
          </>
        )}
      </div>
    </section>
  )
}
