import type { CSSProperties } from 'react'
import { ICON_ART } from './stoaIconArt'

export interface StoaIconProps {
  name: string
  /** Rendered box in px. */
  size?: number
  /** Any CSS colour; defaults to inheriting via currentColor. */
  color?: string
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
export function StoaIcon({ name, size = 24, color, className, style }: StoaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ color, ...style }}
      aria-hidden
      focusable="false"
    >
      {ICON_ART[name] ?? ICON_ART.Folder}
    </svg>
  )
}
