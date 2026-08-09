/**
 * Small, purely-local UI preferences — the kind of state that describes how
 * *this* device likes to look at the app, not what the user has recorded.
 *
 * WHY NOT AppSettings. AppSettings is the app's real, backed-up, exportable
 * settings record (Article 23 includes it in the backup file). A collapsed
 * section is view chrome: it does not belong in an export, it does not need
 * to survive a restore onto another device, and adding a Dexie field per
 * disclosure toggle would grow the schema for something with no data value.
 * localStorage is the correct tier for it.
 *
 * Every access is wrapped: Safari in Private Browsing has historically
 * thrown on localStorage writes, and a disclosure toggle must never be able
 * to take the screen down with it. A failed read simply returns the default.
 */

const PREFIX = 'stoa.ui.'

export function readUiPref(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return raw === '1'
  } catch {
    return fallback
  }
}

export function writeUiPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(PREFIX + key, value ? '1' : '0')
  } catch {
    // Storage unavailable (private mode, quota). The toggle still works for
    // this session; it just won't be remembered. Silently acceptable.
  }
}

/** The Daily Brief's expanded/collapsed state on Today. */
export const BRIEF_EXPANDED_PREF = 'briefExpanded'

/** Which grid tab was last chosen — true means "Done". Stored so the grid
 * reopens where you left it rather than snapping back to "To do" on every
 * navigation. Still only a default: resolveGridTab's all-done flip and any
 * explicit tap both continue to win. */
export const GRID_TAB_PREF = 'gridTabDone'
