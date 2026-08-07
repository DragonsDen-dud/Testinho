import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { moveItem } from '../../lib/reorder'
import { isTasksPlanningEnabled } from '../../lib/featureFlags'

const DEFAULT_ORDER = ['habits', 'todos']

/**
 * Article 45 — the underlying AppSettings.homeScreenModuleOrder field and
 * Dashboard's respecting of it already existed; only this reorder UI was
 * missing. Pointer-based (not HTML5 drag-and-drop, which doesn't work
 * reliably on touch) so the same gesture works on mobile and desktop — no
 * library installed for this, it's a small custom implementation using
 * document-level pointermove + elementFromPoint rather than pointerenter
 * on each row, since touch pointers implicitly capture to their start
 * element and would otherwise never fire enter events on siblings.
 *
 * Scope decision: only the genuinely persistent Dashboard sections (Habits,
 * Todos) are reorderable. The weekly/monthly AI report banners are
 * transient — they only render when a report happens to be ready and
 * un-dismissed — so giving them a fixed position in a "module order" would
 * be reordering something that's usually invisible. Not included.
 */
export function HomeScreenOrderSection() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const [order, setOrder] = useState<string[]>(settings?.homeScreenModuleOrder ?? DEFAULT_ORDER)
  const orderRef = useRef(order)
  orderRef.current = order
  const draggingIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (draggingIndexRef.current !== null) return
    setOrder(settings?.homeScreenModuleOrder ?? DEFAULT_ORDER)
  }, [settings?.homeScreenModuleOrder])

  // Habits Refocus round — the 'todos' module drops out of this list while
  // the flag is off. Filtered at render only: the stored
  // homeScreenModuleOrder array keeps 'todos' in whatever position it had,
  // so flipping the flag back restores the exact prior order rather than
  // appending it to the end.
  const tasksEnabled = isTasksPlanningEnabled(settings)
  const visibleOrder = order.filter((key) => key !== 'todos' || tasksEnabled)

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (draggingIndexRef.current === null) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-order-index]') as HTMLElement | null
      if (!row) return
      const index = Number(row.dataset.orderIndex)
      const from = draggingIndexRef.current
      if (from === index) return
      setOrder((prev) => moveItem(prev, from, index))
      draggingIndexRef.current = index
      setDraggingIndex(index)
    }

    function onUp() {
      if (draggingIndexRef.current === null) return
      draggingIndexRef.current = null
      setDraggingIndex(null)
      updateAppSettings({ homeScreenModuleOrder: orderRef.current })
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('settings.homeScreenOrder')}</label>
      <ul className="flex flex-col gap-1.5">
        {/* data-order-index is the key's index in the *stored* order, not
            in the filtered list — so the drag math keeps operating on the
            real array even while a module is filtered out of view. */}
        {visibleOrder.map((key) => {
          const index = order.indexOf(key)
          return (
          <li
            key={key}
            data-order-index={index}
            onPointerDown={() => {
              draggingIndexRef.current = index
              setDraggingIndex(index)
            }}
            className={`flex items-center gap-2 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-2.5 text-sm select-none touch-none cursor-grab active:cursor-grabbing ${
              draggingIndex === index ? 'opacity-70' : ''
            }`}
          >
            <span aria-hidden className="text-[var(--stoa-text-muted)]">
              ⠿
            </span>
            {t(`dashboard.${key}Section`)}
          </li>
          )
        })}
      </ul>
    </div>
  )
}
