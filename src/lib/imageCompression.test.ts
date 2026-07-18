import { describe, expect, it } from 'vitest'
import { computeTargetDimensions } from './imageCompression'

/**
 * Article 23 — only the pure resize math is covered here. The actual
 * pixel decode/re-encode (compressImage, using createImageBitmap +
 * canvas.toBlob) needs a real Canvas 2D implementation, which jsdom does
 * not provide. This sandbox also can't install node-canvas as a
 * workaround — its native build requires the pangocairo system library,
 * which isn't present here (confirmed by a real failed `npm install
 * canvas`, not assumed). The mandatory "compression measurably reduces
 * byte size and pixel dimensions" proof is instead performed live, in a
 * real Chromium instance, as part of this round's Playwright pass — see
 * the final report for that result.
 */
describe('computeTargetDimensions (Article 23)', () => {
  it('leaves dimensions unchanged when already within the max', () => {
    expect(computeTargetDimensions(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })

  it('leaves dimensions unchanged exactly at the boundary', () => {
    expect(computeTargetDimensions(1280, 720, 1280)).toEqual({ width: 1280, height: 720 })
  })

  it('scales a landscape image down so the long edge equals the max', () => {
    const result = computeTargetDimensions(4000, 3000, 1280)
    expect(result.width).toBe(1280)
    expect(result.height).toBe(960) // 3000 * (1280/4000) = 960, aspect ratio preserved
  })

  it('scales a portrait image down so the long edge (height) equals the max', () => {
    const result = computeTargetDimensions(3000, 4000, 1280)
    expect(result.height).toBe(1280)
    expect(result.width).toBe(960)
  })

  it('scales a square image down so both edges equal the max', () => {
    expect(computeTargetDimensions(2000, 2000, 1280)).toEqual({ width: 1280, height: 1280 })
  })

  it('respects a custom maxDimension override', () => {
    expect(computeTargetDimensions(2000, 1000, 500)).toEqual({ width: 500, height: 250 })
  })
})
