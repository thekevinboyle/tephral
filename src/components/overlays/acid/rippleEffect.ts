/**
 * rippleEffect.ts
 * Concentric wave displacement from brightness peaks
 * Creates water ripple distortion emanating from bright areas
 */

export interface RippleParams {
  frequency: number
  amplitude: number
  speed: number
  decay: number
}

// Animation state
let rippleTime = 0

export function renderRipple(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: RippleParams,
  deltaTime: number = 16
): void {
  const { frequency, amplitude, speed, decay } = params

  // Update animation time
  rippleTime += (speed * deltaTime) / 1000

  // Get source image data
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const sourcePixels = sourceData.data

  // Find brightness peaks (ripple centers)
  const centers = findBrightnessPeaks(sourcePixels, width, height, 8)

  // Create output image data
  const destData = destCtx.createImageData(width, height)
  const destPixels = destData.data

  // For each pixel, calculate displacement from all ripple centers
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalDisplaceX = 0
      let totalDisplaceY = 0

      // Sum displacements from all ripple centers
      for (const center of centers) {
        const dx = x - center.x
        const dy = y - center.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 1) continue

        // Ripple wave
        const wave = Math.sin(dist * frequency * 0.1 - rippleTime * 5)

        // Decay based on distance and brightness
        const distDecay = Math.exp(-dist * decay * 0.01)
        const brightnessScale = center.brightness

        // Displacement along radial direction
        const displaceAmount = wave * amplitude * distDecay * brightnessScale
        totalDisplaceX += (dx / dist) * displaceAmount
        totalDisplaceY += (dy / dist) * displaceAmount
      }

      // Sample from displaced position
      const sampleX = Math.floor(x - totalDisplaceX)
      const sampleY = Math.floor(y - totalDisplaceY)

      const destIdx = (y * width + x) * 4

      if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
        const sourceIdx = (sampleY * width + sampleX) * 4
        destPixels[destIdx] = sourcePixels[sourceIdx]
        destPixels[destIdx + 1] = sourcePixels[sourceIdx + 1]
        destPixels[destIdx + 2] = sourcePixels[sourceIdx + 2]
        destPixels[destIdx + 3] = 255
      } else {
        // Out of bounds - use black
        destPixels[destIdx] = 0
        destPixels[destIdx + 1] = 0
        destPixels[destIdx + 2] = 0
        destPixels[destIdx + 3] = 255
      }
    }
  }

  destCtx.putImageData(destData, 0, 0)
}

interface BrightnessCenter {
  x: number
  y: number
  brightness: number
}

function findBrightnessPeaks(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  maxCenters: number
): BrightnessCenter[] {
  const gridSize = 64 // Sample grid for finding peaks
  const candidates: BrightnessCenter[] = []

  // Sample in a grid to find local brightness maxima
  for (let gy = 0; gy < height; gy += gridSize) {
    for (let gx = 0; gx < width; gx += gridSize) {
      // Find brightest point in this grid cell
      let maxBrightness = 0
      let maxX = gx
      let maxY = gy

      const endX = Math.min(gx + gridSize, width)
      const endY = Math.min(gy + gridSize, height)

      // Sample at intervals within the cell
      for (let y = gy; y < endY; y += 8) {
        for (let x = gx; x < endX; x += 8) {
          const idx = (y * width + x) * 4
          const r = pixels[idx]
          const g = pixels[idx + 1]
          const b = pixels[idx + 2]
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

          if (brightness > maxBrightness) {
            maxBrightness = brightness
            maxX = x
            maxY = y
          }
        }
      }

      // Only add if brightness is significant
      if (maxBrightness > 0.5) {
        candidates.push({ x: maxX, y: maxY, brightness: maxBrightness })
      }
    }
  }

  // Sort by brightness and take top N
  candidates.sort((a, b) => b.brightness - a.brightness)
  return candidates.slice(0, maxCenters)
}

// Reset function for when effect is toggled off/on
export function resetRipple(): void {
  rippleTime = 0
}
