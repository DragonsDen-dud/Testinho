import { shareOrDownloadFile, type ShareOrDownloadOutcome } from './shareOrDownload'

/** Article 55 — delivery mechanism for a generated CSV, same Share/download
 * fallback as the .ics export (src/lib/icsDownload.ts). */
export async function triggerCsvExport(filename: string, csvContent: string): Promise<ShareOrDownloadOutcome> {
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const file = new File([blob], filename, { type: 'text/csv' })
  return shareOrDownloadFile(file)
}
