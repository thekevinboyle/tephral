/**
 * timefallEffect.ts
 * Vertical rain streaks that age/weather the image where they pass
 * Creates the timefall effect from Death Stranding
 */

import type { TimefallParams } from '../../../stores/strandStore'

interface Raindrop {
  x: number
  y: number
  speed: number
  length: number
}

let raindrops: Raindrop[] = []

export function renderTimefall(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: TimefallParams,
  deltaTime: number
): void {
  const { intensity, streakCount, ageAmount } = params

  // Initialize raindrops if needed
  while (raindrops.length < streakCount) {
    raindrops.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 200 + Math.random() * 300,
      length: 20 + Math.random() * 40,
    })
  }

  // Trim if too many
  if (raindrops.length > streakCount) {
    raindrops = raindrops.slice(0, streakCount)
  }

  // Get source data
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const outputData = ctx.createImageData(width, height)
  const src = sourceData.data
  const out = outputData.data

  // Copy source to output first
  for (let i = 0; i < src.length; i++) {
    out[i] = src[i]
  }

  // Update and render raindrops
  for (const drop of raindrops) {
    // Update position
    drop.y += drop.speed * deltaTime * intensity

    // Reset if off screen
    if (drop.y > height + drop.length) {
      drop.y = -drop.length
      drop.x = Math.random() * width
    }

    // Apply aging effect along the streak
    const startY = Math.max(0, Math.floor(drop.y - drop.length))
    const endY = Math.min(height - 1, Math.floor(drop.y))
    const x = Math.floor(drop.x)

    if (x >= 0 && x < width) {
      for (let y = startY; y <= endY; y++) {
        const i = (y * width + x) * 4

        // Calculate streak intensity (stronger at bottom)
        const streakPos = (y - startY) / drop.length
        const streakIntensity = streakPos * intensity * ageAmount

        // Desaturate
        const gray = (out[i] + out[i + 1] + out[i + 2]) / 3
        out[i] = out[i] + (gray - out[i]) * streakIntensity
        out[i + 1] = out[i + 1] + (gray - out[i + 1]) * streakIntensity
        out[i + 2] = out[i + 2] + (gray - out[i + 2]) * streakIntensity

        // Add noise
        if (Math.random() < streakIntensity * 0.5) {
          const noise = (Math.random() - 0.5) * 50
          out[i] = Math.max(0, Math.min(255, out[i] + noise))
          out[i + 1] = Math.max(0, Math.min(255, out[i + 1] + noise))
          out[i + 2] = Math.max(0, Math.min(255, out[i + 2] + noise))
        }
      }
    }
  }

  ctx.putImageData(outputData, 0, 0)

  // Draw visible rain streaks on top
  ctx.strokeStyle = 'rgba(200, 200, 220, 0.3)'
  ctx.lineWidth = 1
  for (const drop of raindrops) {
    ctx.beginPath()
    ctx.moveTo(drop.x, drop.y - drop.length)
    ctx.lineTo(drop.x, drop.y)
    ctx.stroke()
  }
}
