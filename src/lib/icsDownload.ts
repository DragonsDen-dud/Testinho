import { shareOrDownloadFile, type ShareOrDownloadOutcome } from './shareOrDownload'

/**
 * Article 13 — delivery mechanism for a generated .ics file. Thin wrapper
 * over the generic shareOrDownloadFile (extracted out during the Article 55
 * batch so a third copy of the same Share/download fallback wasn't needed)
 * — except on iOS Safari, which needs a different mechanism entirely; see
 * isIOSSafari's doc comment below.
 */
export type IcsExportOutcome = ShareOrDownloadOutcome

export const ICS_MIME_TYPE = 'text/calendar'

/**
 * Confirmed via live testing on a real iPhone, not assumed from
 * documentation: handing a text/calendar Blob/File to navigator.share()
 * — even with the exactly correct MIME type — lands in iOS's generic
 * Share Sheet with no special handling; tapping the file card there does
 * nothing. iOS Safari's native "Add Event" import screen only appears on
 * a *direct navigation* to a text/calendar resource (e.g. tapping a link
 * to one, or window.location = a blob: URL of that type) — a mechanism
 * entirely separate from the Web Share API. That's what this function
 * detects, so triggerIcsExport can route .ics specifically through
 * navigation instead of share/download on this platform only.
 *
 * iPadOS 13+ Safari's default UA string claims to be desktop macOS, so
 * the iPhone/iPod UA check alone misses iPads unless "Request Mobile
 * Website" is on — the platform+maxTouchPoints check catches the default
 * case too (no real Mac reports touch points).
 */
export function isIOSSafari(
  userAgent: string = navigator.userAgent,
  platform: string = navigator.platform,
  maxTouchPoints: number = navigator.maxTouchPoints,
): boolean {
  const isIPhoneOrIPod = /iPhone|iPod/.test(userAgent)
  const isIPad = /iPad/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  return isIPhoneOrIPod || isIPad
}

export async function triggerIcsExport(filename: string, icsContent: string): Promise<IcsExportOutcome> {
  const blob = new Blob([icsContent], { type: ICS_MIME_TYPE })

  if (isIOSSafari()) {
    const url = URL.createObjectURL(blob)
    window.location.href = url
    // Revoked well after the navigation has had time to actually consume
    // the URL — revoking immediately risks a race against the browser
    // still reading it.
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    return 'downloaded'
  }

  const file = new File([blob], filename, { type: ICS_MIME_TYPE })
  return shareOrDownloadFile(file)
}
