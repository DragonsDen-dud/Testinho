import type { CSSProperties } from 'react'
import { ICON_ART } from './stoaIconArt'

export interface StoaIconProps {
  name: string
  /** Rendered box in px. */
  size?: number
  /** Any CSS colour; defaults to inheriting via currentColor. */
  color?: string
  /**
   * What sits *behind* the glyph — the badge's plate colour.
   *
   * Supplying it turns the duotone accent from "same colour at 55%" into a
   * real cut-out, which is the only way internal detail survives on a
   * single-hue glyph (see stoaIconArt's ACCENT note: a translucent accent
   * over the solid mass is invisible whether the ink is black or white).
   * Omitted, the icon renders exactly as it did before this existed.
   */
  accentColor?: string
  className?: string
  style?: CSSProperties
}

/**
 * Renders one badge icon from STOA's drawn set (see stoaIconArt.tsx).
 *
 * Falls back to Folder for an unknown name rather than rendering nothing —
 * a habit whose stored `icon` predates this set, or arrived via a restored
 * backup, still gets a badge instead of an empty disc.
 */
export function StoaIcon({ name, size = 24, color, accentColor, className, style }: StoaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={
        {
          color,
          // Opacity goes to 1 alongside the colour: a cut-out that is still
          // 55% transparent just tints the solid underneath it.
          ...(accentColor
            ? { '--stoa-icon-accent': accentColor, '--stoa-icon-accent-opacity': 1 }
            : null),
          ...style,
        } as CSSProperties
      }
      aria-hidden
      focusable="false"
    >
      {ICON_ART[name] ?? ICON_ART.Folder}
    </svg>
  )
}
