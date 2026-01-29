/**
 * umbilicalEffect.ts
 * Organic pulsing tendrils reaching from edges
 * Creates the BB connection/umbilical cord visual from Death Stranding
 */

import type { UmbilicalParams } from '../../../stores/strandStore'

interface Tendril {
  startX: number
  startY: number
  angle: number
  length: number
  phase: number
}

let tendrils: Tendril[] = []
let lastTendrilCount = 0

export function renderUmbilical(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: UmbilicalParams,
  time: number
): void {
  const { tendrilCount, reachDistance, pulseSpeed } = params
  const maxLength = Math.min(width, height) * reachDistance

  // Regenerate tendrils if count changed
  if (tendrils.length !== tendrilCount || lastTendrilCount !== tendrilCount) {
    tendrils = []
    lastTendrilCount = tendrilCount

    for (let i = 0; i < tendrilCount; i++) {
      // Distribute around edges
      const edge = i % 4
      let startX: number, startY: number, angle: number

      switch (edge) {
        case 0: // Top
          startX = (i / tendrilCount) * width
          startY = 0
          angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5
          break
        case 1: // Right
          startX = width
          startY = (i / tendrilCount) * height
          angle = Math.PI + (Math.random() - 0.5) * 0.5
          break
        case 2: // Bottom
          startX = (i / tendrilCount) * width
          startY = height
          angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5
          break
        default: // Left
          startX = 0
          startY = (i / tendrilCount) * height
          angle = (Math.random() - 0.5) * 0.5
          break
      }

      tendrils.push({
        startX,
        startY,
        angle,
        length: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (const tendril of tendrils) {
    const pulseTime = time * pulseSpeed + tendril.phase
    const currentLength = maxLength * tendril.length * (0.8 + 0.2 * Math.sin(pulseTime))

    // Draw tendril as bezier curve with wave
    ctx.beginPath()
    ctx.moveTo(tendril.startX, tendril.startY)

    const segments = 20
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const dist = currentLength * t

      // Wave offset perpendicular to tendril direction
      const wave = Math.sin(t * Math.PI * 3 + pulseTime * 2) * 15 * (1 - t)
      const perpAngle = tendril.angle + Math.PI / 2

      const x = tendril.startX + Math.cos(tendril.angle) * dist + Math.cos(perpAngle) * wave
      const y = tendril.startY + Math.sin(tendril.angle) * dist + Math.sin(perpAngle) * wave

      ctx.lineTo(x, y)
    }

    // Gradient stroke - cyan fading to orange at tip
    const gradient = ctx.createLinearGradient(
      tendril.startX, tendril.startY,
      tendril.startX + Math.cos(tendril.angle) * currentLength,
      tendril.startY + Math.sin(tendril.angle) * currentLength
    )
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)')
    gradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.8)')

    ctx.strokeStyle = gradient
    ctx.lineWidth = 3 + Math.sin(pulseTime) * 1
    ctx.lineCap = 'round'
    ctx.stroke()

    // Inner glow line
    ctx.strokeStyle = 'rgba(200, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}
