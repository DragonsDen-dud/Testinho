import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Keyboard, Smile, Shapes, Trash2 } from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { IconPicker } from '../ui/IconPicker'
import { HabitVisual } from './HabitVisual'
import { EMOJI_GROUPS } from '../../lib/habitEmoji'
import { pickTypedEmoji } from '../../lib/emojiInput'
import { compressImage } from '../../lib/imageCompression'

/** Habit art is shown at 46px on a tile and 52px at detail size, so a
 * 1280px photo (the shared compression default) is ~25× more pixels than
 * any surface can use and costs real IndexedDB space per habit. 320px
 * still covers a 3× retina render of the largest surface. */
export const HABIT_IMAGE_MAX_DIMENSION = 320

/** Which grid is showing below the always-visible controls. */
export type LookTab = 'emoji' | 'icon'

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
 *    offline PWA. On iOS these are genuinely detailed artwork. Two ways
 *    in: the curated grid, or (STOA-8) typing any emoji from the device's
 *    own keyboard into the field at the top. Both write the same
 *    `Habit.emoji` and draw through the same HabitVisual branch — a typed
 *    🦑 and a tapped 🏃 are indistinguishable downstream.
 *
 * The drawn set stays as the third tier and the default, so nothing that
 * exists today changes or breaks.
 *
 * LAYOUT (STOA-8): the three affordances sit side by side, visible at once
 * — the typed-emoji field and the photo button in one row, the emoji grid
 * beneath. No tabs or disclosures hide any of them. The only toggle is the
 * segmented control that swaps the grid between the curated emoji and the
 * drawn icons, since those two grids are alternatives for the same slot.
 *
 * Each tier writes its own field and clearing one falls back to the next
 * (see lib/habitLook.ts), so browsing here never destroys a choice.
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
  // The curated grid is one of the three always-visible affordances, so it
  // is the grid shown first; the drawn set is one tap away on the toggle.
  const [tab, setTab] = useState<LookTab>('emoji')

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

  /**
   * The typed field is controlled by the *resolved* emoji, never by the raw
   * keystrokes, so it can only ever display one whole emoji:
   *  - typed value contains an emoji → that one (grapheme-aware, see
   *    lib/emojiInput.ts) becomes the habit's emoji; any text or extra
   *    emoji around it is discarded on the spot. Like a grid tap, this
   *    drops a photo, which would otherwise keep winning precedence and
   *    make the tap look dead.
   *  - typed value is empty (the user deleted the emoji) → the emoji tier
   *    is cleared and the look falls back to the drawn icon.
   *  - typed value is text with no emoji → ignored; the previous emoji
   *    stays and the field snaps back to it. Save is never blocked.
   */
  function handleTyped(raw: string) {
    if (raw === '') {
      if (emoji) onChange({ emoji: undefined })
      return
    }
    const picked = pickTypedEmoji(raw, emoji)
    if (picked && picked !== emoji) onChange({ emoji: picked, image: undefined })
  }

  const chooseButtonClass =
    'min-h-11 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3 flex items-center justify-center gap-2 text-sm stoa-focusable'

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

      {/* The two "bring your own" affordances, side by side with the grid
          below — all three visible at once, none behind a tab. */}
      <div className="grid grid-cols-2 gap-2">
        <label className={`${chooseButtonClass} cursor-text focus-within:border-[var(--stoa-accent)]`}>
          <Keyboard size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--stoa-text-muted)]" />
          <input
            type="text"
            value={emoji ?? ''}
            onChange={(e) => handleTyped(e.target.value)}
            aria-label={t('habits.lookTypeLabel')}
            placeholder={t('habits.lookTypePlaceholder')}
            // No autocorrect/capitalisation: this field is for the keyboard's
            // emoji key, and every text "correction" would just be discarded.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            className="min-w-0 flex-1 bg-transparent outline-none text-center text-xl leading-none placeholder:text-sm placeholder:text-[var(--stoa-text-muted)]"
          />
        </label>

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
          className={`${chooseButtonClass} disabled:opacity-50 ${image ? 'border-[var(--stoa-accent)]' : ''}`}
        >
          <ImagePlus size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--stoa-text-muted)]" />
          <span className="truncate">
            {busy ? t('photo.compressing') : image ? t('habits.lookPhotoReplace') : t('habits.lookPhotoChoose')}
          </span>
        </button>
      </div>
      {error && <p className="text-xs text-[var(--stoa-danger)]">{error}</p>}
      {image && <p className="text-xs text-[var(--stoa-text-muted)]">{t('habits.lookPhotoHint')}</p>}

      <SegmentedTabs
        value={tab}
        onChange={(k) => setTab(k as LookTab)}
        tabs={[
          { key: 'emoji', label: t('habits.lookEmoji') },
          { key: 'icon', label: t('habits.lookIcon') },
        ]}
      />

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
