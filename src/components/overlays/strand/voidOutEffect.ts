/**
 * voidOutEffect.ts
 * Circular shockwave distortion expanding from center
 * Creates the void-out explosion effect from Death Stranding
 */

import type { VoidOutParams } from '../../../stores/strandStore'

let currentRadius = 0
let expanding = true

export function renderVoidOut(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: VoidOutParams,
  deltaTime: number
): void {
  const { speed, distortAmount, ringWidth } = params
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)

  // Update radius
  if (expanding) {
    currentRadius += speed * 200 * deltaTime
    if (currentRadius > maxRadius) {
      expanding = false
    }
  } else {
    currentRadius -= speed * 200 * deltaTime
    if (currentRadius < 0) {
      currentRadius = 0
      expanding = true
    }
  }

  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const outputData = ctx.createImageData(width, height)
  const src = sourceData.data
  const out = outputData.data

  const ringInner = currentRadius - ringWidth * 50
  const ringOuter = currentRadius + ringWidth * 50

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * width + x) * 4

      let srcX = x
      let srcY = y

      // Apply distortion in the ring
      if (dist > ringInner && dist < ringOuter) {
        const ringPos = (dist - ringInner) / (ringOuter - ringInner)
        const distortStrength = Math.sin(ringPos * Math.PI) * distortAmount

        // Radial distortion
        const angle = Math.atan2(dy, dx)
        const distort = distortStrength * 30
        srcX = x + Math.cos(angle) * distort
        srcY = y + Math.sin(angle) * distort
      }

      // Clamp source coordinates
      srcX = Math.max(0, Math.min(width - 1, Math.floor(srcX)))
      srcY = Math.max(0, Math.min(height - 1, Math.floor(srcY)))

      const srcI = (srcY * width + srcX) * 4

      // Inside the ring: slight inversion/darkening
      if (dist < ringInner && currentRadius > 10) {
        const innerFade = Math.min(1, dist / ringInner)
        out[i] = src[srcI] * (0.3 + 0.7 * innerFade)
        out[i + 1] = src[srcI + 1] * (0.3 + 0.7 * innerFade)
        out[i + 2] = src[srcI + 2] * (0.3 + 0.7 * innerFade)
      } else {
        out[i] = src[srcI]
        out[i + 1] = src[srcI + 1]
        out[i + 2] = src[srcI + 2]
      }
      out[i + 3] = 255
    }
  }

  ctx.putImageData(outputData, 0, 0)

  // Draw ring glow
  if (currentRadius > 10) {
    ctx.strokeStyle = `rgba(255, 100, 50, ${0.5 * (1 - currentRadius / maxRadius)})`
    ctx.lineWidth = ringWidth * 20
    ctx.beginPath()
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2)
    ctx.stroke()
  }
}
