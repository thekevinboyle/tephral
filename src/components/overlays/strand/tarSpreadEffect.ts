/**
 * tarSpreadEffect.ts
 * Black tar-like liquid spreading from dark regions
 * Creates the BT presence feeling from Death Stranding
 */

import type { TarSpreadParams } from '../../../stores/strandStore'

// Persistent state for tar spread simulation
let tarMask: Float32Array | null = null
let lastWidth = 0
let lastHeight = 0

export function renderTarSpread(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: TarSpreadParams,
  deltaTime: number
): void {
  const { spreadSpeed, threshold, coverage } = params

  // Initialize or reset tar mask if dimensions changed
  if (!tarMask || lastWidth !== width || lastHeight !== height) {
    tarMask = new Float32Array(width * height)
    lastWidth = width
    lastHeight = height
    // Seed from edges
    for (let y = 0; y < height; y++) {
      tarMask[y * width] = 0.5 // Left edge
      tarMask[y * width + width - 1] = 0.5 // Right edge
    }
    for (let x = 0; x < width; x++) {
      tarMask[x] = 0.5 // Top edge
      tarMask[(height - 1) * width + x] = 0.5 // Bottom edge
    }
  }

  // Get source luminance to seed new tar from dark areas
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Seed tar from dark areas based on threshold
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const luminance = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255
      if (luminance < threshold && tarMask[y * width + x] < 0.1) {
        tarMask[y * width + x] = Math.random() * 0.3
      }
    }
  }

  // Spread tar using simple cellular automata
  const newMask = new Float32Array(tarMask.length)
  const spread = spreadSpeed * deltaTime * 10

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const current = tarMask[idx]

      // Get neighbor values
      const neighbors = [
        tarMask[idx - 1],           // left
        tarMask[idx + 1],           // right
        tarMask[idx - width],       // top
        tarMask[idx + width],       // bottom
      ]

      const maxNeighbor = Math.max(...neighbors)

      // Spread from neighbors, limited by coverage
      if (current < coverage) {
        newMask[idx] = Math.min(coverage, current + (maxNeighbor - current) * spread)
      } else {
        newMask[idx] = current
      }
    }
  }

  tarMask = newMask

  // Render tar overlay
  const outputData = ctx.createImageData(width, height)
  const out = outputData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const i = idx * 4
      const tarAmount = tarMask[idx]

      if (tarAmount > 0.05) {
        // Dark tar with slight purple/orange tint
        out[i] = 10 + Math.random() * 5     // R - slight variation
        out[i + 1] = 5 + Math.random() * 3  // G
        out[i + 2] = 15 + Math.random() * 5 // B - slight purple
        out[i + 3] = Math.min(255, tarAmount * 300) // Alpha
      }
    }
  }

  ctx.putImageData(outputData, 0, 0)
}

export function resetTarSpread(): void {
  tarMask = null
}
