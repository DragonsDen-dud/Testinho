/**
 * Article 13 — delivery mechanism for a generated .ics file. Prefers the Web
 * Share API with a File attachment (what triggers "Add to Calendar" style
 * share-sheet entries on mobile Safari/Chrome) when the platform actually
 * supports sharing files, falling back to a plain Blob + <a download> click
 * for desktop browsers where file sharing isn't available. No prior example
 * of this fallback pattern exists elsewhere in this codebase — this is the
 * first place either mechanism is used.
 */
export type IcsExportOutcome = 'shared' | 'downloaded' | 'cancelled'

export async function triggerIcsExport(filename: string, icsContent: string): Promise<IcsExportOutcome> {
  const blob = new Blob([icsContent], { type: 'text/calendar' })
  const file = new File([blob], filename, { type: 'text/calendar' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      // A user-cancelled share must not fall through to a forced download —
      // that would be a surprising, unrequested side effect of dismissing
      // the share sheet. Only a genuine failure falls back.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return 'downloaded'
}
