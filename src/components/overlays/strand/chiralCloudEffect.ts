/**
 * chiralCloudEffect.ts
 * Fog that pools in dark areas with purple tint
 * Creates the chiral contamination atmosphere from Death Stranding
 */

import type { ChiralCloudParams } from '../../../stores/strandStore'

// Perlin-like noise using simple layered sine waves
function noise2D(x: number, y: number, time: number): number {
  return (
    Math.sin(x * 0.01 + time) * 0.5 +
    Math.sin(y * 0.01 - time * 0.7) * 0.5 +
    Math.sin((x + y) * 0.007 + time * 0.5) * 0.3 +
    Math.sin((x - y) * 0.005 + time * 0.3) * 0.2
  ) / 1.5
}

export function renderChiralCloud(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ChiralCloudParams,
  time: number
): void {
  const { density, responsiveness, tint } = params

  // Get source for brightness detection
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Create output image data
  const outputData = ctx.createImageData(width, height)
  const out = outputData.data

  // Process pixels with downsampling for performance
  const step = 2

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4

      // Get source brightness (inverted - darker = more fog)
      const brightness = (src[i] + src[i + 1] + src[i + 2]) / (3 * 255)
      const darkness = 1 - brightness

      // Calculate fog density based on darkness and responsiveness
      const fogBase = darkness * responsiveness

      // Add animated noise for swirling effect
      const noiseVal = noise2D(x, y, time * 0.5)
      const fogAmount = Math.max(0, Math.min(1, (fogBase + noiseVal * 0.3) * density))

      if (fogAmount > 0.05) {
        // Purple/blue tint based on tint parameter
        // tint 0 = blue, tint 0.5 = purple, tint 1 = magenta
        const r = Math.floor(80 + tint * 80)
        const g = Math.floor(50 + (1 - tint) * 30)
        const b = Math.floor(120 + tint * 50)
        const alpha = Math.floor(fogAmount * 150)

        // Fill the step x step block
        for (let dy = 0; dy < step && y + dy < height; dy++) {
          for (let dx = 0; dx < step && x + dx < width; dx++) {
            const oi = ((y + dy) * width + (x + dx)) * 4
            out[oi] = r
            out[oi + 1] = g
            out[oi + 2] = b
            out[oi + 3] = alpha
          }
        }
      }
    }
  }

  ctx.putImageData(outputData, 0, 0)
}
