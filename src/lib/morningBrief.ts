import { PRESET_COLORS } from './presets'
import type { EveningReview } from '../db/types'

/**
 * STOA-6 — the Daily Brief image, drawn with the Canvas 2D API.
 *
 * WHY CANVAS AND NOT AN HTML-TO-IMAGE LIBRARY. The brief asked to check
 * what's already in the project before adding a dependency. `chartExport.ts`
 * already establishes exactly this pipeline — draw to a canvas, `toBlob`,
 * hand the File to `shareOrDownloadFile` — so canvas is the existing
 * precedent, not a new mechanism. The alternatives all cost more than they
 * give here: html2canvas and html-to-image both work by inlining the DOM
 * into an SVG `<foreignObject>`, which on iOS Safari (this app's only real
 * target — Article 43) has long-standing problems rendering web fonts and
 * silently produces blank or unstyled output. Since the card is a fixed,
 * known layout rather than arbitrary user DOM, drawing it directly is both
 * smaller (zero bytes added) and more predictable.
 *
 * WYSIWYG BY CONSTRUCTION. This same function paints the canvas shown in
 * the app and the canvas exported to Photos — there is no separate
 * "export version" that could drift from what's on screen.
 *
 * FONT. STOA never adopted a custom typeface (verified against the shipped
 * CSS, not assumed — see the round report), so this uses the app's own
 * system stack. No font loading, so nothing can race the first paint.
 */

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'

/** Logical canvas size — a 4:5 portrait card, the shape that survives being
 * saved to Photos and looked at on a phone. Pixel size is this times the
 * device pixel ratio (see renderMorningBrief). */
export const BRIEF_WIDTH = 720
export const BRIEF_HEIGHT = 900

/**
 * The warm gradient mesh, sourced from STOA-5's shipped palette rather than
 * invented: violet (PRESET_COLORS[1]), pink ([6]) and orange ([9]) are the
 * exact three hues the brief named, and they already exist in the palette
 * this app ships. Nothing here is a new color value.
 */
const MESH = {
  violet: PRESET_COLORS[1], // #8b5cf6
  pink: PRESET_COLORS[6], // #ec4899
  orange: PRESET_COLORS[9], // #f97316
} as const

export interface MorningBriefContent {
  /** Localized, already-formatted date line. */
  dateLine: string
  greeting: string
  wakeLabel: string
  wakeTime?: string
  trainingLabel: string
  trainingPlan?: string
  warmUpLabel: string
  warmUp?: string
  mustWinsLabel: string
  mustWins: string[]
  /** The single closing line (see pickBriefLine). */
  closingLine: string
  /** Small footer mark — the Space name, so a saved image says where it came from. */
  footer: string
}

/**
 * The closing line.
 *
 * DELIBERATE TENSION, RESOLVED TOWARD THE SPEC. The brief asks for "a short
 * motivational line"; SPEC.md Article 19 forbids motivational slogans and
 * forced enthusiasm outright ("Ты справишься! 💪" is its own example of what
 * not to write), and Section G item 13 repeats it as a non-negotiable. So
 * these are written as calm, measured statements of intent rather than
 * cheerleading — the register Article 19 actually asks for. They are
 * deterministic per date (not random), so the same day always shows the
 * same line and reopening the app never reshuffles it.
 *
 * These live here as plain keys resolved through i18n by the caller, so
 * changing the wording is a translation edit, not a code change.
 */
export const BRIEF_LINE_KEYS = [
  'morningBrief.lineOne',
  'morningBrief.lineTwo',
  'morningBrief.lineThree',
  'morningBrief.lineFour',
  'morningBrief.lineFive',
] as const

/** Stable per-day pick — same date, same line, every open. */
export function pickBriefLineKey(date: string): (typeof BRIEF_LINE_KEYS)[number] {
  let sum = 0
  for (let i = 0; i < date.length; i += 1) sum += date.charCodeAt(i)
  return BRIEF_LINE_KEYS[sum % BRIEF_LINE_KEYS.length]
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Greedy word wrap. Returns at most `maxLines` lines, ellipsising the last
 * one if the text overruns — a must-win typed as a paragraph must not push
 * the layout off the card or silently vanish.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current) lines.push(current)

  if (lines.length === maxLines) {
    // If anything is left over, mark the truncation honestly.
    const joined = lines.join(' ')
    const consumed = joined.split(/\s+/).length
    if (consumed < words.length) {
      let last = lines[maxLines - 1]
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd()
      }
      lines[maxLines - 1] = `${last}…`
    }
  }
  return lines
}

/** Paints the warm mesh background: three soft radial pools over a base. */
function paintMesh(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1a1524'
  ctx.fillRect(0, 0, BRIEF_WIDTH, BRIEF_HEIGHT)

  const pools: { x: number; y: number; r: number; color: string }[] = [
    { x: BRIEF_WIDTH * 0.18, y: BRIEF_HEIGHT * 0.1, r: BRIEF_WIDTH * 0.72, color: MESH.violet },
    { x: BRIEF_WIDTH * 0.92, y: BRIEF_HEIGHT * 0.3, r: BRIEF_WIDTH * 0.66, color: MESH.pink },
    { x: BRIEF_WIDTH * 0.3, y: BRIEF_HEIGHT * 0.92, r: BRIEF_WIDTH * 0.78, color: MESH.orange },
  ]
  for (const pool of pools) {
    const gradient = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, pool.r)
    gradient.addColorStop(0, `${pool.color}cc`)
    gradient.addColorStop(0.55, `${pool.color}4d`)
    gradient.addColorStop(1, `${pool.color}00`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, BRIEF_WIDTH, BRIEF_HEIGHT)
  }

  // A dark scrim over the lower half so body text keeps real contrast
  // against the brightest part of the mesh, whatever the hues do.
  const scrim = ctx.createLinearGradient(0, BRIEF_HEIGHT * 0.25, 0, BRIEF_HEIGHT)
  scrim.addColorStop(0, 'rgba(12, 8, 20, 0)')
  scrim.addColorStop(1, 'rgba(12, 8, 20, 0.62)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, BRIEF_WIDTH, BRIEF_HEIGHT)
}

/**
 * Draws the whole brief onto `canvas`, sizing it for the current device
 * pixel ratio. Returns nothing — the canvas itself is the output, whether
 * it's being shown on screen or handed to toBlob for export.
 */
export function renderMorningBrief(canvas: HTMLCanvasElement, content: MorningBriefContent): void {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3)
  canvas.width = BRIEF_WIDTH * dpr
  canvas.height = BRIEF_HEIGHT * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  paintMesh(ctx)

  const pad = 56
  const contentWidth = BRIEF_WIDTH - pad * 2
  ctx.textBaseline = 'top'

  // Header — date, then the greeting as the one large piece of type.
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = `500 22px ${FONT_STACK}`
  ctx.fillText(content.dateLine.toUpperCase(), pad, pad)

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 58px ${FONT_STACK}`
  ctx.fillText(content.greeting, pad, pad + 40)

  let y = pad + 132

  // Three compact facts, each only drawn when it has a value.
  const facts: { label: string; value?: string }[] = [
    { label: content.wakeLabel, value: content.wakeTime },
    { label: content.trainingLabel, value: content.trainingPlan },
    { label: content.warmUpLabel, value: content.warmUp },
  ]
  for (const fact of facts) {
    if (!fact.value) continue
    ctx.fillStyle = 'rgba(255,255,255,0.62)'
    ctx.font = `600 19px ${FONT_STACK}`
    ctx.fillText(fact.label.toUpperCase(), pad, y)

    ctx.fillStyle = '#ffffff'
    ctx.font = `600 30px ${FONT_STACK}`
    const lines = wrapText(ctx, fact.value, contentWidth, 2)
    lines.forEach((line, i) => ctx.fillText(line, pad, y + 26 + i * 36))
    y += 26 + lines.length * 36 + 26
  }

  // Must-wins — the point of the card, so they get the panel.
  if (content.mustWins.length > 0) {
    const rowHeights = content.mustWins.map((win) => {
      ctx.font = `600 28px ${FONT_STACK}`
      return wrapText(ctx, win, contentWidth - 96, 2).length * 36 + 18
    })
    const panelHeight = 62 + rowHeights.reduce((a, b) => a + b, 0)

    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundedRect(ctx, pad - 20, y - 16, contentWidth + 40, panelHeight, 28)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = `600 19px ${FONT_STACK}`
    ctx.fillText(content.mustWinsLabel.toUpperCase(), pad, y + 4)

    let rowY = y + 44
    content.mustWins.forEach((win, index) => {
      // Numbered dot, filled from the mesh hues in order.
      const dotColor = [MESH.violet, MESH.pink, MESH.orange][index % 3]
      ctx.fillStyle = dotColor
      ctx.beginPath()
      ctx.arc(pad + 14, rowY + 15, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 18px ${FONT_STACK}`
      ctx.textAlign = 'center'
      ctx.fillText(String(index + 1), pad + 14, rowY + 6)
      ctx.textAlign = 'left'

      ctx.fillStyle = '#ffffff'
      ctx.font = `600 28px ${FONT_STACK}`
      const lines = wrapText(ctx, win, contentWidth - 96, 2)
      lines.forEach((line, i) => ctx.fillText(line, pad + 48, rowY + i * 36))
      rowY += lines.length * 36 + 18
    })
    y += panelHeight + 24
  }

  // Closing line. It follows the content rather than being pinned to the
  // bottom outright — a review with only a wake time and one must-win
  // otherwise left a large dead zone in the middle of the card, which the
  // first live render made obvious. It still can't run past the footer, so
  // a full card reads exactly as before: flow when short, pin when tall.
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `500 italic 27px ${FONT_STACK}`
  const closingLines = wrapText(ctx, content.closingLine, contentWidth, 2)
  const closingFloor = BRIEF_HEIGHT - pad - 34 - closingLines.length * 34
  const closingTop = Math.min(y + 28, closingFloor)
  closingLines.forEach((line, i) => ctx.fillText(line, pad, closingTop + i * 34))

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `500 18px ${FONT_STACK}`
  ctx.fillText(content.footer, pad, BRIEF_HEIGHT - pad - 6)
}

/** Encodes whatever is currently on the canvas as a PNG. */
export async function briefCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('png_encode_failed')
  return blob
}

/** Builds the renderer's input from a stored review. Pure — no formatting
 * or translation happens inside the renderer itself. */
export function briefContentFrom(
  review: EveningReview,
  labels: Omit<MorningBriefContent, 'wakeTime' | 'trainingPlan' | 'warmUp' | 'mustWins'>,
): MorningBriefContent {
  return {
    ...labels,
    wakeTime: review.wakeTime,
    trainingPlan: review.trainingPlan,
    warmUp: review.warmUp,
    mustWins: review.mustWins,
  }
}
