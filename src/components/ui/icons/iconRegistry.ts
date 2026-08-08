import { ICON_ART } from './stoaIconArt'

/**
 * The non-component half of the drawn icon set, split out so each module
 * exports one kind of thing (React Fast Refresh requires a component file
 * to export only components, and the linter enforces it).
 *
 * Derived from the art map rather than hand-listed, so it cannot drift.
 */
export const STOA_ICON_NAMES = Object.keys(ICON_ART)

export function hasStoaIcon(name: string): boolean {
  return name in ICON_ART
}
