import { StoaIcon } from '../ui/icons/stoaIcons'
import { useBlobUrl } from '../../lib/useBlobUrl'
import { accessibleTextColor, gradientFromColor } from '../../styles/tokens'
import { resolveHabitLook, type HabitLook } from '../../lib/habitLook'
import type { Habit } from '../../db/types'

/**
 * A habit's identity, drawn — photo, emoji, or drawn icon — at one size.
 *
 * One component so the three kinds can never drift apart across the four
 * surfaces that show them (grid tile, tray bubble, detail sheet, the
 * picker's own preview). Callers pass a size and a colour and get the
 * right thing back; they do not branch on which kind it is.
 *
 * BLOB URL LIFECYCLE is the whole reason this is a component rather than a
 * function. `URL.createObjectURL` leaks until revoked, and a grid of twenty
 * habits re-rendering on every check-in would mint a new URL per tile per
 * render. The effect creates exactly one per Blob identity and revokes it
 * on change/unmount.
 */
export function HabitVisual({
  habit,
  fallbackIcon,
  color,
  size,
  rounded = 'rounded-2xl',
  /** Set on a "done" tile, where the plate inverts to ink. */
  inverted = false,
}: {
  habit: Pick<Habit, 'image' | 'emoji' | 'icon'>
  fallbackIcon: string
  color: string
  size: number
  rounded?: string
  inverted?: boolean
}) {
  const look = resolveHabitLook(habit, fallbackIcon)
  const url = useBlobUrl(look.kind === 'photo' ? look.image : undefined)
  const ink = accessibleTextColor(color)

  // The plate: hue normally, ink when the surrounding tile is filled.
  const plate = inverted ? ink : color
  const glyph = inverted ? color : ink

  if (look.kind === 'photo') {
    return (
      <span
        className={`inline-flex overflow-hidden shrink-0 ${rounded}`}
        style={{ width: size, height: size, backgroundColor: plate }}
      >
        {url && (
          // object-cover, never contain: a habit photo is a crop, not a
          // document. A letterboxed photo in a rounded square looks broken.
          <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
        )}
      </span>
    )
  }

  if (look.kind === 'emoji') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${rounded}`}
        style={{
          width: size,
          height: size,
          // backgroundColor, never the `background` shorthand: React warns
          // (correctly) when a shorthand and a longhand for the same
          // property are both set and one of them changes between renders,
          // which is exactly what happens when a tile flips to done.
          backgroundColor: plate,
          backgroundImage: inverted ? undefined : gradientFromColor(color),
          // Emoji carry their own colour, so they sit on the plate as
          // artwork rather than being tinted by it. Sized against the plate
          // rather than fixed, so one component covers 24px to 96px.
          fontSize: Math.round(size * 0.58),
          lineHeight: 1,
        }}
      >
        <span aria-hidden>{(look as Extract<HabitLook, { kind: 'emoji' }>).emoji}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${rounded}`}
      style={{
        width: size,
        height: size,
        backgroundColor: plate,
        backgroundImage: inverted ? undefined : gradientFromColor(color),
      }}
    >
      <StoaIcon name={look.icon} size={Math.round(size * 0.6)} color={glyph} accentColor={plate} />
    </span>
  )
}

