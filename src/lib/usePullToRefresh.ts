import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 64

/**
 * Article 44 — a pull-down gesture over the nearest scrollable ancestor
 * (only while it's already scrolled to the top, matching native
 * pull-to-refresh behavior) manually triggers `onRefresh`. No library
 * installed for this, so it's a small pointer-event implementation scoped
 * to whatever page renders it — attach only where it's actually wanted
 * (Dashboard), not globally in AppShell.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const distanceRef = useRef(0)
  // Mirrors the latest onRefresh without needing to re-register listeners —
  // same pattern used for useSpeechToText's onTranscript callback.
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!(e.target instanceof Element)) return
      const scroller = e.target.closest('.overflow-y-auto') as HTMLElement | null
      if (!scroller || scroller.scrollTop > 0) return
      scrollerRef.current = scroller
      startYRef.current = e.clientY
    }

    function onPointerMove(e: PointerEvent) {
      if (startYRef.current === null || !scrollerRef.current) return
      if (scrollerRef.current.scrollTop > 0) {
        startYRef.current = null
        distanceRef.current = 0
        setPullDistance(0)
        return
      }
      const delta = Math.max(0, e.clientY - startYRef.current)
      distanceRef.current = Math.min(delta, THRESHOLD * 1.5)
      setPullDistance(distanceRef.current)
    }

    async function onPointerUp() {
      if (startYRef.current === null) return
      const shouldRefresh = distanceRef.current >= THRESHOLD
      startYRef.current = null
      scrollerRef.current = null
      distanceRef.current = 0
      setPullDistance(0)
      if (shouldRefresh) {
        setRefreshing(true)
        await onRefreshRef.current()
        setRefreshing(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  return { pullDistance, refreshing, threshold: THRESHOLD }
}
