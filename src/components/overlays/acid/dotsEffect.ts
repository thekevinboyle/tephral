/**
 * dotsEffect.ts
 * Rigid grid of circles/squares/diamonds where size = brightness
 * Inspired by Ryoji Ikeda data visualization aesthetics
 */

export interface DotsParams {
  gridSize: number
  dotScale: number
  threshold: number
  shape: 'circle' | 'square' | 'diamond'
}

export function renderDots(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: DotsParams
): void {
  const { gridSize, dotScale, threshold, shape } = params

  // Background handled by AcidOverlay based on preserveVideo setting

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // White fill for shapes
  destCtx.fillStyle = '#fff'

  const halfGrid = gridSize / 2
  const maxRadius = halfGrid * dotScale

  // Iterate over grid cells
  for (let y = halfGrid; y < height; y += gridSize) {
    for (let x = halfGrid; x < width; x += gridSize) {
      // Sample pixel at grid center
      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      // Calculate brightness (0-1)
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Skip if below threshold
      if (brightness < threshold) continue

      // Radius based on brightness
      const radius = brightness * maxRadius

      switch (shape) {
        case 'circle':
          destCtx.beginPath()
          destCtx.arc(x, y, radius, 0, Math.PI * 2)
          destCtx.fill()
          break

        case 'square':
          destCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
          break

        case 'diamond':
          destCtx.beginPath()
          destCtx.moveTo(x, y - radius)
          destCtx.lineTo(x + radius, y)
          destCtx.lineTo(x, y + radius)
          destCtx.lineTo(x - radius, y)
          destCtx.closePath()
          destCtx.fill()
          break
      }
    }
  }
}
