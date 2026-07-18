import { shareOrDownloadFile, type ShareOrDownloadOutcome } from './shareOrDownload'

/**
 * Article 13 — delivery mechanism for a generated .ics file. Thin wrapper
 * over the generic shareOrDownloadFile (extracted out during the Article 55
 * batch so a third copy of the same Share/download fallback wasn't needed).
 */
export type IcsExportOutcome = ShareOrDownloadOutcome

export async function triggerIcsExport(filename: string, icsContent: string): Promise<IcsExportOutcome> {
  const blob = new Blob([icsContent], { type: 'text/calendar' })
  const file = new File([blob], filename, { type: 'text/calendar' })
  return shareOrDownloadFile(file)
}
