/**
 * beachStaticEffect.ts
 * Grainy otherworldly static with inverted luminance zones
 * Creates the "between worlds" feeling from Beach scenes
 */

import type { BeachStaticParams } from '../../../stores/strandStore'

// State for animation
let lastFlickerTime = 0
let invertBlocks: { x: number; y: number; w: number; h: number }[] = []

export function renderBeachStatic(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: BeachStaticParams,
  time: number
): void {
  const { grainAmount, invertProbability, flickerSpeed } = params

  // Update invert blocks periodically based on flicker speed
  if (time - lastFlickerTime > (1 / flickerSpeed)) {
    lastFlickerTime = time
    invertBlocks = []

    // Generate random blocks to invert
    const blockCount = Math.floor(invertProbability * 20)
    for (let i = 0; i < blockCount; i++) {
      const blockW = 20 + Math.random() * 100
      const blockH = 10 + Math.random() * 50
      invertBlocks.push({
        x: Math.random() * (width - blockW),
        y: Math.random() * (height - blockH),
        w: blockW,
        h: blockH,
      })
    }
  }

  // Get source image data
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const outputData = ctx.createImageData(width, height)
  const src = sourceData.data
  const out = outputData.data

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      let r = src[i]
      let g = src[i + 1]
      let b = src[i + 2]

      // Check if pixel is in an invert block
      let invert = false
      for (const block of invertBlocks) {
        if (x >= block.x && x < block.x + block.w &&
            y >= block.y && y < block.y + block.h) {
          invert = true
          break
        }
      }

      // Invert colors if in block
      if (invert) {
        r = 255 - r
        g = 255 - g
        b = 255 - b
      }

      // Add grain noise
      if (Math.random() < grainAmount) {
        const noise = (Math.random() - 0.5) * 100
        r = Math.max(0, Math.min(255, r + noise))
        g = Math.max(0, Math.min(255, g + noise))
        b = Math.max(0, Math.min(255, b + noise))
      }

      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    }
  }

  ctx.putImageData(outputData, 0, 0)
}
