/**
 * bbPodEffect.ts
 * Amber-tinted pod vignette with caustics and bubbles
 * Creates the BB Pod view from Death Stranding
 */

import type { BBPodParams } from '../../../stores/strandStore'

interface Bubble {
  x: number
  y: number
  size: number
  speed: number
  wobble: number
}

let bubbles: Bubble[] = []
const MAX_BUBBLES = 20

export function renderBBPod(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: BBPodParams,
  time: number
): void {
  const { vignetteSize, tintStrength, causticAmount } = params

  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2
  const vignetteRadius = maxRadius * vignetteSize

  ctx.save()

  // Draw amber vignette
  const vignetteGradient = ctx.createRadialGradient(
    centerX, centerY, vignetteRadius * 0.6,
    centerX, centerY, maxRadius * 1.2
  )

  const tintAlpha = tintStrength * 0.4
  vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignetteGradient.addColorStop(0.5, `rgba(180, 120, 40, ${tintAlpha * 0.3})`)
  vignetteGradient.addColorStop(0.8, `rgba(150, 90, 20, ${tintAlpha * 0.6})`)
  vignetteGradient.addColorStop(1, `rgba(80, 50, 10, ${tintAlpha})`)

  ctx.fillStyle = vignetteGradient
  ctx.fillRect(0, 0, width, height)

  // Draw caustic ripples at edge
  if (causticAmount > 0) {
    ctx.globalCompositeOperation = 'screen'

    const rippleCount = 5
    for (let i = 0; i < rippleCount; i++) {
      const phase = time * 0.5 + (i / rippleCount) * Math.PI * 2
      const rippleRadius = vignetteRadius + Math.sin(phase) * 20 * causticAmount

      ctx.beginPath()
      ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 200, 100, ${causticAmount * 0.15})`
      ctx.lineWidth = 3 + Math.sin(phase * 2) * 2
      ctx.stroke()
    }

    // Caustic light patterns
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      const wave = Math.sin(angle * 5 + time * 2) * causticAmount * 20
      const r = vignetteRadius + wave
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r

      const causticGradient = ctx.createRadialGradient(x, y, 0, x, y, 30)
      causticGradient.addColorStop(0, `rgba(255, 220, 150, ${causticAmount * 0.2})`)
      causticGradient.addColorStop(1, 'rgba(255, 200, 100, 0)')

      ctx.fillStyle = causticGradient
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Manage bubbles
  while (bubbles.length < MAX_BUBBLES * causticAmount) {
    bubbles.push({
      x: Math.random() * width,
      y: height + Math.random() * 50,
      size: 2 + Math.random() * 8,
      speed: 20 + Math.random() * 40,
      wobble: Math.random() * Math.PI * 2
    })
  }
  while (bubbles.length > MAX_BUBBLES * causticAmount) {
    bubbles.pop()
  }

  // Update and draw bubbles
  ctx.globalCompositeOperation = 'screen'

  for (const bubble of bubbles) {
    // Update position
    bubble.y -= bubble.speed * 0.016 // Assume ~60fps
    bubble.x += Math.sin(time * 3 + bubble.wobble) * 0.5

    // Reset if off screen
    if (bubble.y < -bubble.size) {
      bubble.y = height + bubble.size
      bubble.x = Math.random() * width
    }

    // Only draw bubbles within pod area
    const distFromCenter = Math.hypot(bubble.x - centerX, bubble.y - centerY)
    if (distFromCenter < vignetteRadius * 1.1) {
      // Draw bubble
      const bubbleGradient = ctx.createRadialGradient(
        bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, 0,
        bubble.x, bubble.y, bubble.size
      )
      bubbleGradient.addColorStop(0, 'rgba(255, 240, 200, 0.4)')
      bubbleGradient.addColorStop(0.5, 'rgba(255, 220, 150, 0.2)')
      bubbleGradient.addColorStop(1, 'rgba(255, 200, 100, 0)')

      ctx.fillStyle = bubbleGradient
      ctx.beginPath()
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2)
      ctx.fill()

      // Bubble highlight
      ctx.strokeStyle = 'rgba(255, 255, 230, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(bubble.x, bubble.y, bubble.size, -0.5, 0.5)
      ctx.stroke()
    }
  }

  ctx.restore()
}

export function resetBBPod(): void {
  bubbles = []
}
