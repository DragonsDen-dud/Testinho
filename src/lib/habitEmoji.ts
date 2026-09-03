/**
 * The emoji offered as habit art.
 *
 * WHY EMOJI ARE THE RIGHT ANSWER HERE, and not a cop-out. The drawn set is
 * a single-hue glyph on a coloured plate — by construction it can never be
 * more than a silhouette, because it has to stay legible on all twelve
 * badge colours (see stoaIconArt's note on why everything is
 * `currentColor`). That constraint is exactly what makes the icons feel
 * flat. Emoji are the opposite: full colour, drawn with real depth and
 * shading by the platform vendor, rendered at native resolution, and on
 * iOS they are genuinely detailed artwork. They also cost zero bundle
 * bytes and zero precache budget, which matters for an offline-first PWA
 * that already ships 1.2MB.
 *
 * CURATED, NOT THE WHOLE UNICODE TABLE. A full emoji keyboard is a worse
 * picker than no picker — the point is to find "the one for squats" in
 * about two seconds. These are grouped the way habits actually cluster,
 * and the list is deliberately about ten screens smaller than a system
 * emoji panel.
 *
 * The OS keyboard is still reachable: the picker's own text field accepts
 * anything, so nothing here is a ceiling.
 */
export interface EmojiGroup {
  /** i18n key under `habitEmoji.` */
  key: string
  emoji: string[]
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    key: 'movement',
    emoji: [
      '🏃', '🚴', '🏋️', '🤸', '🧘', '🏊', '🥊', '⚽', '🏀', '🎾',
      '⛰️', '🥾', '🛹', '⛷️', '🏄', '🤾', '🚶', '🧗', '🏸', '🤼',
    ],
  },
  {
    key: 'nourishment',
    emoji: [
      '🥗', '🍎', '🥦', '🥕', '🍌', '🫐', '🥑', '🍳', '🐟', '🍚',
      '💧', '🫗', '🍵', '☕', '🥤', '💊', '🧂', '🍋', '🥜', '🍠',
    ],
  },
  {
    key: 'rest',
    emoji: [
      '😴', '🛏️', '🌙', '⭐', '🌅', '🛁', '🧖', '🕯️', '🫧', '🌊',
      '❄️', '🚿', '🧴', '🪥', '🦷', '💤',
    ],
  },
  {
    key: 'mind',
    emoji: [
      '📚', '📖', '✍️', '🧠', '🗒️', '🎓', '🔬', '🧩', '♟️', '🗺️',
      '🈚', '🔤', '📝', '💭', '🙏', '☮️',
    ],
  },
  {
    key: 'work',
    emoji: [
      '💻', '⌨️', '📊', '📈', '💼', '📎', '📅', '⏰', '📮', '🗂️',
      '🛠️', '⚙️', '🧾', '💰', '🏦', '🎯',
    ],
  },
  {
    key: 'creative',
    emoji: [
      '🎨', '🎸', '🎹', '🎤', '🎬', '📷', '🪴', '🧵', '🪡', '🖌️',
      '🎻', '🥁', '📻', '🎧', '✂️', '🧶',
    ],
  },
  {
    key: 'care',
    emoji: [
      '❤️', '🫂', '📞', '💌', '🐕', '🐈', '🌻', '🏡', '🧹', '🧺',
      '🍽️', '🛒', '👨‍👩‍👧', '🤝', '🎁', '🕊️',
    ],
  },
  {
    key: 'avoid',
    emoji: [
      '🚭', '🍺', '🚫', '📵', '🍩', '🎰', '📺', '🛍️', '⏳', '🥱',
    ],
  },
]

/** Flat list, for validation and tests. */
export const ALL_HABIT_EMOJI: string[] = EMOJI_GROUPS.flatMap((g) => g.emoji)
