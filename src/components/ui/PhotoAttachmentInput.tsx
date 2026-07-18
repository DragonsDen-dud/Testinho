import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compressImage } from '../../lib/imageCompression'

/**
 * Article 23 — shared by HabitLog.note, Todo.description, and
 * JournalEntry.text surfaces. A plain controlled input (value + onChange):
 * callers decide when the result actually gets persisted (buffered until
 * Save in TodoForm/JournalEntryForm, saved immediately in HabitCard's
 * post-check-in fields, matching how the mic button is already used in
 * both of those shapes elsewhere in this app).
 *
 * Compression (canvas resize + JPEG re-encode) always runs on selection,
 * before onChange ever fires — nothing upstream of this component ever
 * sees or stores the original, uncompressed file.
 */
export function PhotoAttachmentInput({ photo, onChange }: { photo?: Blob; onChange: (photo: Blob | undefined) => void }) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(undefined)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function handleFileSelected(file: File) {
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } finally {
      setCompressing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleFileSelected(file)
        }}
      />
      {previewUrl ? (
        <div className="flex items-center gap-2">
          <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--stoa-border)]" />
          <button
            type="button"
            className="text-xs text-[var(--stoa-danger)]"
            onClick={() => onChange(undefined)}
          >
            {t('common.delete')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={compressing}
          className="text-xs text-[var(--stoa-accent)] underline underline-offset-2 disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
        >
          {compressing ? t('photo.compressing') : t('photo.attach')}
        </button>
      )}
    </div>
  )
}
