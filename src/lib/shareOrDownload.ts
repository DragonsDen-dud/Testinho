/**
 * Article 13's delivery mechanism, generalized so Article 55 (CSV export)
 * doesn't need a third hand-rolled copy of "try Web Share, fall back to a
 * Blob download." Prefers the Web Share API with a File attachment when the
 * platform actually supports sharing files, falling back to a plain
 * Blob + <a download> click where it doesn't (most desktop browsers).
 */
export type ShareOrDownloadOutcome = 'shared' | 'downloaded' | 'cancelled'

export async function shareOrDownloadFile(file: File): Promise<ShareOrDownloadOutcome> {
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

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return 'downloaded'
}
