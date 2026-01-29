/**
 * chiraliumEffect.ts
 * Golden crystalline fracture patterns on highlights
 * Creates the chiralium crystal visual from Death Stranding
 */

import type { ChiraliumParams } from '../../../stores/strandStore'

interface CrystalSeed {
  x: number
  y: number
  angle: number
  size: number
}

let crystalSeeds: CrystalSeed[] = []
let lastDensity = 0

export function renderChiralium(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ChiraliumParams,
  time: number
): void {
  const { threshold, density, shimmer } = params

  // Get source for brightness detection
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Regenerate seeds if density changed significantly
  const seedCount = Math.floor(density * 100)
  if (Math.abs(crystalSeeds.length - seedCount) > 10 || lastDensity !== density) {
    crystalSeeds = []
    lastDensity = density

    // Find bright spots to seed crystals
    for (let i = 0; i < seedCount; i++) {
      // Random position, weighted toward bright areas
      let attempts = 0
      while (attempts < 20) {
        const x = Math.floor(Math.random() * width)
        const y = Math.floor(Math.random() * height)
        const idx = (y * width + x) * 4
        const brightness = (src[idx] + src[idx + 1] + src[idx + 2]) / (3 * 255)

        if (brightness > threshold || attempts > 15) {
          crystalSeeds.push({
            x,
            y,
            angle: Math.random() * Math.PI * 2,
            size: 10 + Math.random() * 30
          })
          break
        }
        attempts++
      }
    }
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  // Draw crystals at bright locations
  for (const seed of crystalSeeds) {
    // Check if location is still bright
    const idx = (Math.floor(seed.y) * width + Math.floor(seed.x)) * 4
    if (idx < 0 || idx >= src.length - 3) continue

    const brightness = (src[idx] + src[idx + 1] + src[idx + 2]) / (3 * 255)
    if (brightness < threshold * 0.8) continue

    // Shimmer animation
    const shimmerOffset = Math.sin(time * 5 + seed.x * 0.1 + seed.y * 0.1) * shimmer * 0.5
    const alpha = 0.3 + shimmerOffset + brightness * 0.3

    // Draw crystal facets
    drawCrystal(ctx, seed.x, seed.y, seed.size, seed.angle + time * shimmer * 0.5, alpha)
  }

  ctx.restore()
}

function drawCrystal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  alpha: number
): void {
  const facets = 5 + Math.floor(Math.random() * 3)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  // Draw main crystal body
  ctx.beginPath()
  for (let i = 0; i < facets; i++) {
    const angle = (Math.PI * 2 / facets) * i
    const r = size * (0.5 + Math.random() * 0.5)
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()

  // Golden gradient fill
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size)
  gradient.addColorStop(0, `rgba(255, 235, 150, ${alpha * 0.8})`)
  gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.5})`)
  gradient.addColorStop(1, `rgba(200, 150, 0, ${alpha * 0.2})`)
  ctx.fillStyle = gradient
  ctx.fill()

  // Sharp edges
  ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`
  ctx.lineWidth = 1
  ctx.stroke()

  // Inner facet lines
  for (let i = 0; i < facets; i++) {
    const angle = (Math.PI * 2 / facets) * i
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7)
    ctx.strokeStyle = `rgba(255, 235, 150, ${alpha * 0.3})`
    ctx.stroke()
  }

  ctx.restore()
}

export function resetChiralium(): void {
  crystalSeeds = []
}
