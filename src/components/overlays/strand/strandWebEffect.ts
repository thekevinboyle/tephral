/**
 * strandWebEffect.ts
 * Glowing cyan strands connecting bright points
 * Creates the "strand connection" visual from Death Stranding
 */

import type { StrandWebParams } from '../../../stores/strandStore'

interface BrightPoint {
  x: number
  y: number
  brightness: number
}

export function renderStrandWeb(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: StrandWebParams,
  time: number
): void {
  const { threshold, maxConnections, glowIntensity } = params

  // Get source image data
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Find bright points (downsample for performance)
  const gridSize = 20
  const brightPoints: BrightPoint[] = []

  for (let gy = 0; gy < height; gy += gridSize) {
    for (let gx = 0; gx < width; gx += gridSize) {
      let maxBrightness = 0
      let maxX = gx
      let maxY = gy

      // Find brightest point in grid cell
      for (let y = gy; y < Math.min(gy + gridSize, height); y++) {
        for (let x = gx; x < Math.min(gx + gridSize, width); x++) {
          const i = (y * width + x) * 4
          const brightness = (src[i] + src[i + 1] + src[i + 2]) / (3 * 255)
          if (brightness > maxBrightness) {
            maxBrightness = brightness
            maxX = x
            maxY = y
          }
        }
      }

      if (maxBrightness > threshold) {
        brightPoints.push({ x: maxX, y: maxY, brightness: maxBrightness })
      }
    }
  }

  // Draw connections between nearby bright points
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < brightPoints.length; i++) {
    const p1 = brightPoints[i]
    let connections = 0

    // Sort by distance and connect to nearest points
    const sorted = brightPoints
      .filter((_, j) => j !== i)
      .map(p2 => ({
        point: p2,
        dist: Math.hypot(p2.x - p1.x, p2.y - p1.y)
      }))
      .sort((a, b) => a.dist - b.dist)

    for (const { point: p2, dist } of sorted) {
      if (connections >= maxConnections) break
      if (dist > 200) break // Max connection distance

      // Draw strand line with glow
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
      const pulsePhase = (time * 2 + i * 0.5) % 1

      // Traveling light particle effect
      const alpha = glowIntensity * 0.3
      gradient.addColorStop(0, `rgba(0, 212, 255, ${alpha})`)
      gradient.addColorStop(Math.max(0, pulsePhase - 0.1), `rgba(0, 212, 255, ${alpha})`)
      gradient.addColorStop(pulsePhase, `rgba(200, 255, 255, ${glowIntensity * 0.8})`)
      gradient.addColorStop(Math.min(1, pulsePhase + 0.1), `rgba(0, 212, 255, ${alpha})`)
      gradient.addColorStop(1, `rgba(0, 212, 255, ${alpha})`)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 1 + glowIntensity
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      connections++
    }

    // Draw bright point indicator
    ctx.fillStyle = `rgba(0, 212, 255, ${glowIntensity * p1.brightness})`
    ctx.beginPath()
    ctx.arc(p1.x, p1.y, 3 + glowIntensity * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
