import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Smile, Shapes, Trash2 } from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { IconPicker } from '../ui/IconPicker'
import { HabitVisual } from './HabitVisual'
import { EMOJI_GROUPS } from '../../lib/habitEmoji'
import { compressImage } from '../../lib/imageCompression'

/** Habit art is shown at 46px on a tile and 52px at detail size, so a
 * 1280px photo (the shared compression default) is ~25× more pixels than
 * any surface can use and costs real IndexedDB space per habit. 320px
 * still covers a 3× retina render of the largest surface. */
export const HABIT_IMAGE_MAX_DIMENSION = 320

export type LookTab = 'photo' | 'emoji' | 'icon'

/**
 * One place to choose how a habit looks.
 *
 * WHY THREE TIERS RATHER THAN A BETTER ICON SET. The drawn set is a
 * single-hue glyph by construction — it has to stay legible on all twelve
 * badge colours, which is exactly what caps it at "silhouette" (see
 * stoaIconArt). No amount of redrawing escapes that constraint. So instead
 * of fighting it, this adds two tiers that are not bound by it:
 *
 *  - A PHOTO the user took. Nothing is more representative of "what I am
 *    doing there" than a picture of the actual thing. Compressed on
 *    selection like every other photo in the app (Article 23) and stored
 *    locally (Article 4) — it never leaves the device.
 *  - An EMOJI. Full colour, real shading, drawn by the platform vendor,
 *    rendered natively — and zero bundle bytes, which matters for an
 *    offline PWA. On iOS these are genuinely detailed artwork.
 *
 * The drawn set stays as the third tab and the default, so nothing that
 * exists today changes or breaks.
 *
 * The tabs are a *view*, not a mode: each tier writes its own field and
 * clearing one falls back to the next (see lib/habitLook.ts), so browsing
 * between tabs never destroys a choice.
 */
export function HabitLookPicker({
  name,
  color,
  image,
  emoji,
  icon,
  onChange,
}: {
  /** Only used for the live preview. */
  name: string
  color: string
  image?: Blob
  emoji?: string
  icon: string
  onChange: (next: { image?: Blob; emoji?: string; icon?: string }) => void
}) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<LookTab>(image ? 'photo' : emoji ? 'emoji' : 'icon')

  async function pickFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const compressed = await compressImage(file, HABIT_IMAGE_MAX_DIMENSION)
      onChange({ image: compressed })
    } catch {
      // A HEIC the browser can't decode, a corrupt file, a revoked
      // permission — all land here. Saying so beats a silently dead button.
      setError(t('habits.lookPhotoFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <HabitVisual
          habit={{ image, emoji, icon }}
          fallbackIcon={icon}
          color={color}
          size={56}
          rounded="rounded-[18px]"
        />
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm truncate">{name || t('habits.newHabit')}</div>
          <div className="text-xs text-[var(--stoa-text-muted)]">{t('habits.lookPreviewHint')}</div>
        </div>
        {(image || emoji) && (
          <button
            type="button"
            aria-label={t('habits.lookClear')}
            onClick={() => onChange({ image: undefined, emoji: undefined })}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[var(--stoa-text-muted)] stoa-focusable"
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>

      <SegmentedTabs
        value={tab}
        onChange={(k) => setTab(k as LookTab)}
        tabs={[
          { key: 'photo', label: t('habits.lookPhoto') },
          { key: 'emoji', label: t('habits.lookEmoji') },
          { key: 'icon', label: t('habits.lookIcon') },
        ]}
      />

      {tab === 'photo' && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void pickFile(file)
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-dashed border-[var(--stoa-border)] py-6 flex flex-col items-center gap-2 text-sm text-[var(--stoa-text-muted)] disabled:opacity-50 stoa-focusable"
          >
            <ImagePlus size={22} strokeWidth={1.5} aria-hidden />
            {busy ? t('photo.compressing') : image ? t('habits.lookPhotoReplace') : t('habits.lookPhotoChoose')}
          </button>
          {error && <p className="text-xs text-[var(--stoa-danger)]">{error}</p>}
          <p className="text-xs text-[var(--stoa-text-muted)]">{t('habits.lookPhotoHint')}</p>
        </div>
      )}

      {tab === 'emoji' && (
        <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-col gap-1.5">
              <span className="font-heading text-[10px] uppercase text-[var(--stoa-text-muted)] tracking-wide">
                {t(`habitEmoji.${group.key}`)}
              </span>
              <div className="grid grid-cols-8 gap-1">
                {group.emoji.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={e}
                    aria-pressed={emoji === e}
                    // Choosing an emoji drops a photo: the photo would
                    // otherwise keep winning precedence and the tap would
                    // appear to do nothing.
                    onClick={() => onChange({ emoji: e, image: undefined })}
                    className="aspect-square rounded-lg text-xl flex items-center justify-center stoa-focusable"
                    style={{
                      background: emoji === e ? 'var(--stoa-accent-soft)' : 'transparent',
                      outline: emoji === e ? '1px solid var(--stoa-accent)' : undefined,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'icon' && (
        <div className="flex flex-col gap-2">
          <IconPicker
            value={icon}
            color={color}
            onChange={(next) => onChange({ icon: next, emoji: undefined, image: undefined })}
          />
          <p className="text-xs text-[var(--stoa-text-muted)] flex items-center gap-1.5">
            <Shapes size={12} strokeWidth={2} aria-hidden />
            {t('habits.lookIconHint')}
          </p>
        </div>
      )}

      {tab === 'emoji' && !emoji && (
        <p className="text-xs text-[var(--stoa-text-muted)] flex items-center gap-1.5">
          <Smile size={12} strokeWidth={2} aria-hidden />
          {t('habits.lookEmojiHint')}
        </p>
      )}
    </div>
  )
}
