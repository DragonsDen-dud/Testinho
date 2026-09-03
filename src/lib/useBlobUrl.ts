import { useEffect, useState } from 'react'

/**
 * One object URL per Blob, revoked when the Blob changes or the component
 * unmounts.
 *
 * This exists as a hook rather than an inline `URL.createObjectURL` call
 * because that function leaks until revoked: a grid of twenty habit photos
 * re-rendering on every check-in would mint a fresh URL per tile per
 * render and never release any of them.
 *
 * Its own module (not co-located with HabitVisual) so that file exports
 * only components, which is what the Fast Refresh lint rule wants.
 */
export function useBlobUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}
