/**
 * extinctionEffect.ts
 * Edge erosion and decay spreading inward
 * Creates the extinction/void out aftermath from Death Stranding
 */

import type { ExtinctionParams } from '../../../stores/strandStore'

// Persistent erosion state
let erosionMap: Float32Array | null = null
let lastWidth = 0
let lastHeight = 0
let erosionTime = 0

export function renderExtinction(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ExtinctionParams,
  deltaTime: number
): void {
  const { erosionSpeed, decayStages, coverage } = params

  // Initialize or reset erosion map
  if (!erosionMap || lastWidth !== width || lastHeight !== height) {
    erosionMap = new Float32Array(width * height)
    lastWidth = width
    lastHeight = height

    // Seed edges with initial erosion
    for (let y = 0; y < height; y++) {
      erosionMap[y * width] = 1 // Left
      erosionMap[y * width + width - 1] = 1 // Right
    }
    for (let x = 0; x < width; x++) {
      erosionMap[x] = 1 // Top
      erosionMap[(height - 1) * width + x] = 1 // Bottom
    }
  }

  // Update erosion time
  erosionTime += deltaTime * erosionSpeed

  // Spread erosion (simplified cellular automata)
  const maxErosion = coverage
  const spreadRate = erosionSpeed * deltaTime * 5

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const current = erosionMap[idx]

      if (current < maxErosion) {
        // Check neighbors
        const neighbors = [
          erosionMap[idx - 1],
          erosionMap[idx + 1],
          erosionMap[idx - width],
          erosionMap[idx + width]
        ]

        const maxNeighbor = Math.max(...neighbors)
        if (maxNeighbor > current) {
          // Add some randomness to erosion spread
          const spread = (maxNeighbor - current) * spreadRate * (0.5 + Math.random() * 0.5)
          erosionMap[idx] = Math.min(maxErosion, current + spread)
        }
      }
    }
  }

  // Get source image
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Create output
  const outputData = ctx.createImageData(width, height)
  const out = outputData.data

  // Apply erosion effect based on decay stages
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const i = idx * 4
      const erosion = erosionMap[idx]

      let r = src[i]
      let g = src[i + 1]
      let b = src[i + 2]

      if (erosion > 0.01) {
        // Calculate decay stage (0 to decayStages)
        const stage = Math.min(decayStages, Math.floor(erosion * decayStages * 2))

        if (stage >= 1) {
          // Stage 1: Desaturation
          const gray = (r * 0.299 + g * 0.587 + b * 0.114)
          const desatAmount = Math.min(1, erosion * 2)
          r = r + (gray - r) * desatAmount
          g = g + (gray - g) * desatAmount
          b = b + (gray - b) * desatAmount
        }

        if (stage >= 2) {
          // Stage 2: Add noise/grain
          const noiseAmount = Math.min(1, (erosion - 0.3) * 3)
          if (Math.random() < noiseAmount * 0.5) {
            const noise = (Math.random() - 0.5) * 100 * noiseAmount
            r = Math.max(0, Math.min(255, r + noise))
            g = Math.max(0, Math.min(255, g + noise))
            b = Math.max(0, Math.min(255, b + noise))
          }
        }

        if (stage >= 3) {
          // Stage 3: Fade to black
          const blackAmount = Math.min(1, (erosion - 0.5) * 2)
          r *= (1 - blackAmount)
          g *= (1 - blackAmount)
          b *= (1 - blackAmount)
        }

        // Add slight purple tint to eroded areas
        if (erosion > 0.1) {
          const tintAmount = erosion * 0.2
          r = Math.min(255, r + 20 * tintAmount)
          b = Math.min(255, b + 40 * tintAmount)
        }
      }

      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    }
  }

  ctx.putImageData(outputData, 0, 0)
}

export function resetExtinction(): void {
  erosionMap = null
  erosionTime = 0
}
