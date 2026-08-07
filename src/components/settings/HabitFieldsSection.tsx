import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GripVertical } from 'lucide-react'
import { useAppSettings, updateAppSettings } from '../../state/useAppSettings'
import { moveItem } from '../../lib/reorder'
import { resolveHabitFieldOrder, isHabitFieldVisible, type HabitFieldKey } from '../../lib/habitFields'

/**
 * Part 3b — the in-app control for which habit fields appear, and in what
 * order, on the habit creation/edit form and the habit detail view.
 *
 * Two independent controls per row, on purpose: the drag handle reorders,
 * the checkbox shows/hides. Only the handle starts a drag (unlike
 * HomeScreenOrderSection, where the whole row is the handle) — otherwise
 * tapping the checkbox on touch would begin a drag instead of toggling it.
 *
 * Hiding a field never clears its stored value; see lib/habitFields.ts.
 */
export function HabitFieldsSection() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const config = settings?.habitFieldConfig

  const [order, setOrder] = useState<HabitFieldKey[]>(() => resolveHabitFieldOrder(config))
  const orderRef = useRef(order)
  orderRef.current = order
  const draggingIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  // Same guard HomeScreenOrderSection uses: never let a live-query tick
  // overwrite the order mid-drag.
  useEffect(() => {
    if (draggingIndexRef.current !== null) return
    setOrder(resolveHabitFieldOrder(config))
  }, [config])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (draggingIndexRef.current === null) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-field-index]') as HTMLElement | null
      if (!row) return
      const index = Number(row.dataset.fieldIndex)
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
      // Persist the full resolved order, not a diff — that's what makes a
      // later build's newly-added field append predictably rather than
      // land in an arbitrary spot.
      void updateAppSettings({ habitFieldConfig: { ...config, order: orderRef.current } })
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [config])

  function toggleVisible(key: HabitFieldKey, visible: boolean) {
    const hidden = new Set(config?.hidden ?? [])
    if (visible) hidden.delete(key)
    else hidden.add(key)
    void updateAppSettings({ habitFieldConfig: { ...config, hidden: [...hidden] } })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('settings.habitFieldsTitle')}</label>
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('settings.habitFieldsHint')}</p>
      <ul className="flex flex-col gap-1.5">
        {order.map((key, index) => (
          <li
            key={key}
            data-field-index={index}
            className={`flex items-center gap-2 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3 py-2.5 text-sm select-none ${
              draggingIndex === index ? 'opacity-70' : ''
            }`}
          >
            <span
              aria-label={t('settings.habitFieldsReorder')}
              className="text-[var(--stoa-text-muted)] touch-none cursor-grab active:cursor-grabbing -m-1 p-1"
              onPointerDown={() => {
                draggingIndexRef.current = index
                setDraggingIndex(index)
              }}
            >
              <GripVertical size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex-1">{t(`habitFields.${key}`)}</span>
            <input
              type="checkbox"
              aria-label={t('settings.habitFieldsShow', { field: t(`habitFields.${key}`) })}
              checked={isHabitFieldVisible(config, key)}
              onChange={(e) => toggleVisible(key, e.target.checked)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
