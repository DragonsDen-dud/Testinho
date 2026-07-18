import { shareOrDownloadFile, type ShareOrDownloadOutcome } from './shareOrDownload'

/** Article 18 — same Share/download fallback as .ics and CSV exports. */
export async function triggerBackupExport(filename: string, json: string): Promise<ShareOrDownloadOutcome> {
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })
  return shareOrDownloadFile(file)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'))
    reader.readAsText(file)
  })
}
