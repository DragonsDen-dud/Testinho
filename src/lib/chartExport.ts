import { shareOrDownloadFile, type ShareOrDownloadOutcome } from './shareOrDownload'

/**
 * Article 46 — client-side SVG (Recharts renders inline SVG) to PNG
 * conversion, same Share/download mechanism used everywhere else in the app
 * (CSV, .ics). Recharts' <svg> carries explicit width/height attributes,
 * used directly here rather than re-measuring — a detached clone used only
 * for serialization can't be measured via getBoundingClientRect.
 *
 * Browser-only (Image/canvas/XMLSerializer) — same category of limitation
 * as lib/imageCompression.ts, which this sandbox also can't unit-test under
 * jsdom (no real canvas/Image pipeline). Verified live in real Chromium
 * instead; see README for the same disclosure pattern used there.
 */
export async function exportSvgAsPng(svg: SVGSVGElement, filename: string): Promise<ShareOrDownloadOutcome> {
  const width = Number(svg.getAttribute('width')) || svg.clientWidth
  const height = Number(svg.getAttribute('height')) || svg.clientHeight
  const scale = 2 // reasonably sharp export on high-DPI screens

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const serialized = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas_unsupported')
    ctx.scale(scale, scale)
    // Charts are drawn with theme-variable strokes/text that assume a
    // background — a transparent PNG would make dark-theme exports
    // unreadable when viewed outside the app, so this always bakes in white.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    const pngBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('png_encode_failed')

    const file = new File([pngBlob], filename, { type: 'image/png' })
    return shareOrDownloadFile(file)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('svg_image_load_failed'))
    img.src = src
  })
}
