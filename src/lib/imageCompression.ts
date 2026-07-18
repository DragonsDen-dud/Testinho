const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.7

/**
 * The resize math, split out as a pure function specifically so it's
 * testable without a real Canvas — jsdom/Node has no Canvas 2D
 * implementation, and this sandbox can't install node-canvas (its native
 * build requires pangocairo, not present here). The actual pixel
 * decode/encode (compressImage below) is verified live in a real browser
 * instead; see imageCompression.test.ts for that split explained in place.
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION,
): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxDimension) return { width, height }
  const scale = maxDimension / longEdge
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Article 23 — hard requirement: every photo is resized to at most
 * `maxDimension` on its long edge and re-encoded as JPEG before it's ever
 * persisted to IndexedDB. Entirely client-side via canvas, no server
 * round-trip — this app has no photo-handling server (Article 4's proxy
 * only ever talks to Anthropic, and holds nothing).
 */
export async function compressImage(
  source: Blob,
  maxDimension: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('image encoding failed'))),
      'image/jpeg',
      quality,
    )
  })
}
