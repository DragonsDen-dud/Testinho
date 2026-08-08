import type { ReactNode } from 'react'

/**
 * STOA-8 — the app's own habit/category icon set.
 *
 * These replace lucide-react for *category and habit badges only*. Lucide
 * stays exactly where it was for functional UI (nav tabs, buttons, status
 * glyphs, form affordances) — this is a badge art set, not a library swap.
 *
 * WHY CUSTOM RATHER THAN ANOTHER LIBRARY. Every general-purpose icon
 * library, Lucide included, is drawn as thin uniform strokes for use on a
 * plain background. STOA's badges are the opposite context: a saturated
 * gradient disc, ~18px of glyph, seen at arm's length. A 2px outline
 * disappears into that. These are drawn as solid filled masses instead, so
 * the symbol reads as a shape rather than as a wireframe.
 *
 * THE RULES THAT MAKE 40 ICONS ONE FAMILY:
 *  - 24×24 canvas, ~2px optical margin, symbol mass centred.
 *  - Filled geometry first. Stroke is used only for the handful of forms
 *    that genuinely *are* lines (waves, wind, steam) — with round caps and
 *    a 2.6 weight, so they still read as chunky, not hairline.
 *  - Duotone via opacity on a single colour, never a second hue. The
 *    secondary mass sits at ACCENT_OPACITY. This is the load-bearing
 *    constraint: badges pick a black-or-white glyph colour from the
 *    category hue (accessibleTextColor), so an icon that hardcoded its own
 *    colours would break contrast on half the palette. Everything here is
 *    `currentColor`, so all 40 work on all 12 badge colours by
 *    construction.
 *  - Rounded terminals throughout. The set should feel friendly, not
 *    technical — these mark "morning walk", not a settings row.
 *
 * The names are deliberately unchanged from the Lucide set they replace.
 * CATEGORY_ICONS' entries are persisted on Habit.icon and CategoryStyle
 * rows and indexed by the deterministic hash, so renaming even one would
 * mean a data migration. Same identifiers, entirely new art, zero
 * migration.
 */

/**
 * Secondary-mass opacity.
 *
 * Raised from an initial 0.42 after rendering the full sheet: the glyph
 * colour is black on roughly two-thirds of the palette, and black at 0.42
 * over a saturated mid-tone badge is very nearly the badge colour itself —
 * the secondary mass simply vanished. 0.55 separates the two planes on both
 * the black-glyph and white-glyph halves of the palette.
 *
 * PAIRED WITH A DRAWING RULE, which matters more than the number: solid
 * masses are emitted FIRST and accent masses LAST, so an accent always
 * paints on top and reads as a lighter plane. Drawn the other way round the
 * solid covers it and the icon collapses into one flat silhouette — which
 * is exactly what the first pass did to Briefcase, Building2, Code2,
 * Footprints, Bike, Palette and Guitar.
 */
const ACCENT = 0.55

const S = { fill: 'currentColor' } as const
const A = { fill: 'currentColor', opacity: ACCENT } as const
/** For the few genuinely linear forms. */
const L = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** Eight rays for the Sun, generated rather than hand-repeated. */
const sunRays = Array.from({ length: 8 }, (_, i) => (
  <rect key={i} x="11.1" y="0.8" width="1.8" height="3.6" rx="0.9" {...A} transform={`rotate(${i * 45} 12 12)`} />
))

export const ICON_ART: Record<string, ReactNode> = {
  // ── Everyday ──────────────────────────────────────────────────────────
  Folder: (
    <>
      <rect x="1.8" y="6.8" width="20.4" height="13.4" rx="3.2" {...S} />
      <path d="M1.8 8.6V6.2a2.4 2.4 0 0 1 2.4-2.4h4.1c.7 0 1.4.3 1.8.9l1.5 1.9z" {...A} />
    </>
  ),
  Briefcase: (
    <>
      <rect x="1.8" y="6.6" width="20.4" height="14" rx="3.2" {...S} />
      <path d="M8.4 2.2h7.2a2.4 2.4 0 0 1 2.4 2.4v2h-3v-1.4H9v1.4H6V4.6a2.4 2.4 0 0 1 2.4-2.4z" {...A} />
      <rect x="9.4" y="11.4" width="5.2" height="3.4" rx="1.7" {...A} />
    </>
  ),
  Building2: (
    <>
      <rect x="2.4" y="7" width="8.6" height="14.6" rx="2.2" {...S} />
      <rect x="13" y="2.4" width="8.6" height="19.2" rx="2.2" {...S} />
      <rect x="4.8" y="9.6" width="3.8" height="2.6" rx="1.3" {...A} />
      <rect x="4.8" y="14.2" width="3.8" height="2.6" rx="1.3" {...A} />
      <rect x="15.4" y="5.2" width="3.8" height="2.6" rx="1.3" {...A} />
      <rect x="15.4" y="9.8" width="3.8" height="2.6" rx="1.3" {...A} />
      <rect x="15.4" y="14.4" width="3.8" height="2.6" rx="1.3" {...A} />
    </>
  ),
  Code2: (
    <>
      <path d="M8 6 9.8 7.8 5.6 12l4.2 4.2L8.2 18 2 12z" {...S} />
      <path d="M16 6 14.2 7.8 18.4 12l-4.2 4.2 1.6 1.8L22 12z" {...A} />
    </>
  ),
  Wallet: (
    <>
      <rect x="1.8" y="4.4" width="19.4" height="15" rx="3.2" {...S} />
      <path d="M13.4 9.6h8.8v5.2h-8.8a2.6 2.6 0 0 1 0-5.2z" {...A} />
      <circle cx="17.4" cy="12.2" r="1.3" {...S} />
    </>
  ),
  ShoppingCart: (
    <>
      <rect x="1.6" y="3.4" width="5" height="2.4" rx="1.2" {...A} />
      <path d="M5.6 7.6h16l-2.1 8.1a2.2 2.2 0 0 1-2.1 1.7H8.6a2.2 2.2 0 0 1-2.1-1.6z" {...S} />
      <circle cx="9.2" cy="20.2" r="1.9" {...A} />
      <circle cx="17.4" cy="20.2" r="1.9" {...A} />
    </>
  ),
  Users: (
    <>
      <circle cx="9" cy="7.9" r="3.7" {...S} />
      <path d="M2.2 20.4c0-3.8 3-6.8 6.8-6.8s6.8 3 6.8 6.8z" {...S} />
      <circle cx="17.4" cy="8.4" r="2.9" {...A} />
      <path d="M14.2 20.4c0-3 2.1-5.4 4.8-5.4 1.7 0 3 1.1 3 3.3v2.1z" {...A} />
    </>
  ),
  GraduationCap: (
    <>
      <path d="M12 2.6 23 8.2 12 13.8 1 8.2z" {...S} />
      <path d="M6.4 11.6v4.2c0 1.9 2.5 3.4 5.6 3.4s5.6-1.5 5.6-3.4v-4.2L12 14.4z" {...A} />
    </>
  ),
  Plane: (
    <>
      <path d="M21.6 2.4 2.9 10.1c-.8.3-.8 1.4 0 1.7L9 14l2.2 6.1c.3.8 1.4.8 1.7 0z" {...S} />
      <path d="M21.6 2.4 9 14l2.2 6.1c.3.8 1.4.8 1.7 0z" {...A} />
    </>
  ),

  // ── Movement ──────────────────────────────────────────────────────────
  Dumbbell: (
    <>
      <rect x="1.6" y="6.8" width="4.4" height="10.4" rx="2.2" {...A} />
      <rect x="18" y="6.8" width="4.4" height="10.4" rx="2.2" {...A} />
      <rect x="5.2" y="10.2" width="13.6" height="3.6" rx="1.8" {...S} />
    </>
  ),
  Bike: (
    <>
      <path d="M6.6 16.9 12.5 7.4l1.9 1.2-5.9 9.5z" {...S} />
      <path d="M14.3 8.6 18.9 16.6l-1.9 1.1-4.6-8z" {...S} />
      <rect x="6" y="15.7" width="11.4" height="2" rx="1" {...S} />
      <rect x="9.4" y="4.9" width="4.4" height="2.1" rx="1.05" {...S} />
      <rect x="14.6" y="5.9" width="4.6" height="2.1" rx="1.05" {...S} />
      <path d="M5.4 12.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 2.7a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" fillRule="evenodd" {...A} />
      <path d="M18.6 12.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 2.7a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" fillRule="evenodd" {...A} />
    </>
  ),
  Footprints: (
    <>
      <g transform="rotate(-14 6.9 8.6)">
        <ellipse cx="6.9" cy="9.2" rx="3" ry="4.2" {...S} />
        <circle cx="4.6" cy="4.3" r="1.5" {...S} />
      </g>
      <g transform="rotate(-14 17.1 15.4)">
        <ellipse cx="17.1" cy="16" rx="3" ry="4.2" {...A} />
        <circle cx="14.8" cy="11.1" r="1.5" {...A} />
      </g>
    </>
  ),
  Waves: (
    <>
      <path d="M2 7.6c1.6-2.2 3.4-2.2 5 0s3.4 2.2 5 0 3.4-2.2 5 0 3.4 2.2 5 0" {...L} />
      <path d="M2 13c1.6-2.2 3.4-2.2 5 0s3.4 2.2 5 0 3.4-2.2 5 0 3.4 2.2 5 0" {...L} opacity={ACCENT} />
      <path d="M2 18.4c1.6-2.2 3.4-2.2 5 0s3.4 2.2 5 0 3.4-2.2 5 0 3.4 2.2 5 0" {...L} />
    </>
  ),
  Mountain: (
    <>
      <path d="M13.4 3.4 23 20.8H5.4z" {...S} />
      <path d="M7.2 11.6 13.6 20.8H1z" {...A} />
      <path d="m13.4 3.4 3.5 6.3h-7z" {...A} />
    </>
  ),

  // ── Nourishment ───────────────────────────────────────────────────────
  Coffee: (
    <>
      <path d="M2.6 8.6h14.2v6.6a5.4 5.4 0 0 1-5.4 5.4H8a5.4 5.4 0 0 1-5.4-5.4z" {...S} />
      <path d="M16.8 10.2h1.6a3.2 3.2 0 0 1 0 6.4h-1.6z" {...A} />
      <rect x="6.6" y="2" width="2.2" height="4.6" rx="1.1" {...A} />
      <rect x="11.6" y="1.4" width="2.2" height="5.2" rx="1.1" {...A} />
    </>
  ),
  Utensils: (
    <>
      <rect x="2.6" y="2.4" width="1.9" height="7" rx="0.95" {...A} />
      <rect x="7.5" y="2.4" width="1.9" height="7" rx="0.95" {...A} />
      <path d="M3 8.6h6a2 2 0 0 1-1.9 2l.4 10.2a1.5 1.5 0 0 1-3 0L4.9 10.6A2 2 0 0 1 3 8.6z" {...S} />
      <path d="M17.2 2.4c2.2 2.2 2.9 5.4 2.9 8.4 0 1.9-.8 2.8-2.9 2.8z" {...S} />
      <rect x="16.1" y="12.4" width="2.2" height="9.2" rx="1.1" {...S} />
    </>
  ),
  Salad: (
    <>
      <path d="M1.8 11.8h20.4A10.2 10.2 0 0 1 1.8 11.8z" {...S} />
      <circle cx="8.2" cy="8.6" r="2.9" {...A} />
      <circle cx="13.2" cy="7.2" r="3.3" {...A} />
      <circle cx="17.2" cy="9.4" r="2.5" {...A} />
    </>
  ),
  Droplet: (
    <>
      <path d="M12 2.2s-7.2 7.8-7.2 12.4a7.2 7.2 0 0 0 14.4 0C19.2 10 12 2.2 12 2.2z" {...S} />
      <circle cx="9.4" cy="15.2" r="2.1" {...A} />
    </>
  ),
  Wine: (
    <>
      <path d="M6.6 2.6h10.8l-.7 6.6a5.2 5.2 0 0 1-10.4 0z" {...S} />
      <path d="M6.85 4.9h10.3l-.22 2.1H7.07z" {...A} />
      <rect x="10.9" y="13.4" width="2.2" height="6.2" rx="1.1" {...S} />
      <rect x="7" y="19" width="10" height="2.4" rx="1.2" {...S} />
    </>
  ),

  // ── Rest & sleep ──────────────────────────────────────────────────────
  Bed: (
    <>
      <rect x="4.6" y="9" width="6" height="4" rx="2" {...A} />
      <rect x="11.4" y="9" width="9.8" height="4" rx="2" {...A} />
      <rect x="1.6" y="7" width="2.6" height="13.4" rx="1.3" {...S} />
      <rect x="1.6" y="12.6" width="20.8" height="5.4" rx="2.2" {...S} />
      <rect x="19.8" y="16.4" width="2.6" height="4" rx="1.3" {...S} />
    </>
  ),
  Moon: (
    <>
      <path d="M20.6 14.6A8.6 8.6 0 0 1 9.4 3.4 9.1 9.1 0 1 0 20.6 14.6z" {...S} />
      <circle cx="17.6" cy="5.2" r="1.5" {...A} />
      <circle cx="20.8" cy="9" r="1" {...A} />
    </>
  ),
  Sun: (
    <>
      {sunRays}
      <circle cx="12" cy="12" r="5.2" {...S} />
    </>
  ),
  Wind: (
    <>
      <path d="M2.4 7.6h10.2a3 3 0 1 0-3-3" {...L} />
      <path d="M2.4 12.8h14.8a3 3 0 1 1-3 3" {...L} opacity={ACCENT} />
      <path d="M2.4 18h6.4" {...L} />
    </>
  ),

  // ── Mind & wellbeing ──────────────────────────────────────────────────
  Heart: (
    <>
      <path
        d="M12 21.2 10.6 19.9C5.5 15.3 2.2 12.3 2.2 8.6A5.4 5.4 0 0 1 7.6 3.2c1.7 0 3.4.8 4.4 2.1 1-1.3 2.7-2.1 4.4-2.1a5.4 5.4 0 0 1 5.4 5.4c0 3.7-3.3 6.7-8.4 11.3z"
        {...S}
      />
      <circle cx="8" cy="8.4" r="1.7" {...A} />
    </>
  ),
  Leaf: (
    <>
      <path d="M3.4 20.6C3.4 10.4 10.4 3.4 20.6 3.4c0 10.2-7 17.2-17.2 17.2z" {...S} />
      <path d="m3.9 21.1 17.2-17.2-1.3-1.3L2.6 19.8z" {...A} />
    </>
  ),
  Brain: (
    <>
      <path d="M9.8 2.6A4.3 4.3 0 0 0 5.5 6.9v.3a3.7 3.7 0 0 0-.9 6.6 4 4 0 0 0 4 7.6h1.2a1 1 0 0 0 1-1v-17a1 1 0 0 0-1-.8z" {...S} />
      <path d="M14.2 2.6a4.3 4.3 0 0 1 4.3 4.3v.3a3.7 3.7 0 0 1 .9 6.6 4 4 0 0 1-4 7.6h-1.2a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-.8z" {...A} />
    </>
  ),
  Timer: (
    <>
      <path
        d="M12 3.6a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zm0 3a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6z"
        fillRule="evenodd"
        {...A}
      />
      <rect x="10.9" y="7.4" width="2.2" height="5.6" rx="1.1" {...S} />
      <rect x="9.4" y="1.2" width="5.2" height="2.8" rx="1.4" {...S} />
    </>
  ),
  Flower2: (
    <>
      <circle cx="12" cy="6.2" r="3.7" {...A} />
      <circle cx="17.8" cy="12" r="3.7" {...A} />
      <circle cx="12" cy="17.8" r="3.7" {...A} />
      <circle cx="6.2" cy="12" r="3.7" {...A} />
      <circle cx="12" cy="12" r="3.3" {...S} />
    </>
  ),
  Sparkles: (
    <>
      <path d="M10.4 2.2 12.2 8l5.8 1.8-5.8 1.8-1.8 5.8-1.8-5.8L2.8 9.8 8.6 8z" {...S} />
      <path d="M18 13.6l.95 2.75 2.75.95-2.75.95L18 21l-.95-2.75-2.75-.95 2.75-.95z" {...A} />
    </>
  ),
  HandHeart: (
    <>
      <path d="M3.2 12.8a1.95 1.95 0 0 1 3.9 0v3.9l3.4 3.9H7.1a3.9 3.9 0 0 1-3.9-3.9z" {...A} />
      <path d="M20.8 12.8a1.95 1.95 0 0 0-3.9 0v3.9l-3.4 3.9h3.3a3.9 3.9 0 0 0 3.9-3.9z" {...A} />
      <path d="M12 12.4 8 8.6a2.85 2.85 0 1 1 4-4 2.85 2.85 0 1 1 4 4z" {...S} />
    </>
  ),

  // ── Creative ──────────────────────────────────────────────────────────
  Music: (
    <>
      <path d="M13.4 3.6 20.6 6v4.4l-7.2-2.4z" {...A} />
      <rect x="10.8" y="3.2" width="2.6" height="14.6" rx="1.3" {...S} />
      <ellipse cx="7.6" cy="17.6" rx="3.9" ry="3.4" {...S} />
    </>
  ),
  Palette: (
    <>
      <path d="M12 2.6a9.4 9.4 0 0 0 0 18.8c1.2 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .9-1.9 1.9-1.9h1.4a5 5 0 0 0 5-5c0-4.1-4.2-7.4-9.3-7.4z" {...A} />
      <circle cx="7.2" cy="11.4" r="1.7" {...S} />
      <circle cx="10.4" cy="7" r="1.7" {...S} />
      <circle cx="15.6" cy="8.4" r="1.7" {...S} />
    </>
  ),
  BookOpen: (
    <>
      <rect x="1.8" y="4.6" width="8.8" height="14.8" rx="2" {...S} />
      <rect x="13.4" y="4.6" width="8.8" height="14.8" rx="2" {...A} />
      <rect x="10.8" y="3.4" width="2.4" height="17.2" rx="1.2" {...S} />
    </>
  ),
  Camera: (
    <>
      <rect x="8" y="2.8" width="8" height="4" rx="1.8" {...A} />
      <rect x="1.8" y="6" width="20.4" height="15" rx="3.6" {...S} />
      <circle cx="12" cy="13.5" r="4.4" {...A} />
      <circle cx="12" cy="13.5" r="1.8" {...S} />
    </>
  ),
  Guitar: (
    <>
      <path d="M13.6 10.4 20.2 3.8 21.6 5.2 15 11.8z" {...S} />
      <path d="M19.6 1.8 22.6 4.8 21 6.4 18 3.4z" {...S} />
      <circle cx="13.8" cy="13.2" r="4" {...S} />
      <circle cx="8.8" cy="17.2" r="5.2" {...S} />
      <circle cx="9.2" cy="16.6" r="2.3" {...A} />
    </>
  ),
  PenTool: (
    <>
      <path d="M12 1.8 20.4 20.6 12 16.4 3.6 20.6z" {...S} />
      <circle cx="12" cy="13.4" r="2.3" {...A} />
    </>
  ),

  // ── Focus & goals ─────────────────────────────────────────────────────
  Target: (
    <>
      <path
        d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8zm0 3.1a6.3 6.3 0 1 1 0 12.6 6.3 6.3 0 0 1 0-12.6z"
        fillRule="evenodd"
        {...A}
      />
      <circle cx="12" cy="12" r="3.4" {...S} />
    </>
  ),
  Zap: (
    <>
      <path d="M13.8 1.6 3.6 13.4h6.2L10.2 22.4 20.4 10.6h-6.2z" {...S} />
      <path d="M13.8 1.6 3.6 13.4h6.2z" {...A} />
    </>
  ),
  Star: (
    <>
      <path d="M12 2 15 8.6l7.2 1-5.2 5 1.3 7.1L12 18.3 5.7 21.7 7 14.6l-5.2-5 7.2-1z" {...S} />
      <path d="M12 2 15 8.6l7.2 1-5.2 5 1.3 7.1L12 18.3z" {...A} />
    </>
  ),
  Smartphone: (
    <>
      <rect x="5.6" y="1.6" width="12.8" height="20.8" rx="3.6" {...S} />
      <rect x="7.8" y="4.8" width="8.4" height="12.2" rx="1.8" {...A} />
      <circle cx="12" cy="19.6" r="1.2" {...A} />
    </>
  ),
}

