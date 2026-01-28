/**
 * ledEffect.ts
 * LED matrix style - circular dots with brightness = opacity
 * Inspired by LED displays and pixel art
 */

export interface LedParams {
  gridSize: number
  dotSize: number
  brightness: number
  bleed: number
}

export function renderLed(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: LedParams
): void {
  const { gridSize, dotSize, brightness: brightnessMult, bleed } = params

  // Black background
  destCtx.fillStyle = '#000'
  destCtx.fillRect(0, 0, width, height)

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  const halfGrid = gridSize / 2
  const dotRadius = (gridSize * dotSize) / 2

  // Iterate over grid cells
  for (let y = halfGrid; y < height; y += gridSize) {
    for (let x = halfGrid; x < width; x += gridSize) {
      // Sample pixel at grid center
      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      // Get pixel values
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]

      // Calculate brightness (0-1)
      const pixelBrightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Apply brightness multiplier
      const opacity = Math.min(1, pixelBrightness * brightnessMult)

      // Skip very dim pixels
      if (opacity < 0.02) continue

      // Draw bleed/glow effect first (if enabled)
      if (bleed > 0 && opacity > 0.1) {
        const glowRadius = dotRadius * (1 + bleed)
        const gradient = destCtx.createRadialGradient(
          x,
          y,
          dotRadius * 0.5,
          x,
          y,
          glowRadius
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        destCtx.fillStyle = gradient
        destCtx.beginPath()
        destCtx.arc(x, y, glowRadius, 0, Math.PI * 2)
        destCtx.fill()
      }

      // Draw main LED dot
      destCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      destCtx.beginPath()
      destCtx.arc(x, y, dotRadius, 0, Math.PI * 2)
      destCtx.fill()

      // Add slight highlight in center for 3D effect
      if (opacity > 0.5) {
        destCtx.fillStyle = `rgba(255, 255, 255, ${(opacity - 0.5) * 0.3})`
        destCtx.beginPath()
        destCtx.arc(
          x - dotRadius * 0.2,
          y - dotRadius * 0.2,
          dotRadius * 0.3,
          0,
          Math.PI * 2
        )
        destCtx.fill()
      }
    }
  }
}
