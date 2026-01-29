/**
 * doomsEffect.ts
 * Luminous halos around bright regions
 * Creates the DOOMS supernatural sense visual from Death Stranding
 */

import type { DoomsParams } from '../../../stores/strandStore'

export function renderDooms(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: DoomsParams,
  time: number
): void {
  const { haloSize, pulseSpeed, sensitivity } = params

  // Get source for brightness detection
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Find bright regions (downsampled for performance)
  const gridSize = 20
  const brightSpots: { x: number; y: number; brightness: number }[] = []

  for (let gy = 0; gy < height; gy += gridSize) {
    for (let gx = 0; gx < width; gx += gridSize) {
      let totalBrightness = 0
      let count = 0

      // Sample grid cell
      for (let y = gy; y < Math.min(gy + gridSize, height); y += 4) {
        for (let x = gx; x < Math.min(gx + gridSize, width); x += 4) {
          const i = (y * width + x) * 4
          const brightness = (src[i] + src[i + 1] + src[i + 2]) / (3 * 255)
          totalBrightness += brightness
          count++
        }
      }

      const avgBrightness = totalBrightness / count
      if (avgBrightness > (1 - sensitivity)) {
        brightSpots.push({
          x: gx + gridSize / 2,
          y: gy + gridSize / 2,
          brightness: avgBrightness
        })
      }
    }
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  // Draw halos around bright spots
  for (const spot of brightSpots) {
    // Pulsing animation
    const pulse = 0.7 + 0.3 * Math.sin(time * pulseSpeed * 2 + spot.x * 0.01 + spot.y * 0.01)
    const radius = haloSize * 100 * spot.brightness * pulse

    // Multi-layer halo for soft glow effect
    for (let layer = 0; layer < 3; layer++) {
      const layerRadius = radius * (1 + layer * 0.5)
      const layerAlpha = (0.3 - layer * 0.08) * spot.brightness * pulse

      const gradient = ctx.createRadialGradient(
        spot.x, spot.y, 0,
        spot.x, spot.y, layerRadius
      )

      // Golden/amber halo color
      gradient.addColorStop(0, `rgba(255, 220, 150, ${layerAlpha})`)
      gradient.addColorStop(0.3, `rgba(255, 200, 100, ${layerAlpha * 0.7})`)
      gradient.addColorStop(0.6, `rgba(255, 180, 80, ${layerAlpha * 0.3})`)
      gradient.addColorStop(1, 'rgba(255, 150, 50, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(spot.x, spot.y, layerRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Inner bright core
    const coreGradient = ctx.createRadialGradient(
      spot.x, spot.y, 0,
      spot.x, spot.y, radius * 0.3
    )
    coreGradient.addColorStop(0, `rgba(255, 255, 230, ${0.4 * pulse})`)
    coreGradient.addColorStop(1, 'rgba(255, 255, 200, 0)')

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(spot.x, spot.y, radius * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
