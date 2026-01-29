/**
 * odradekEffect.ts
 * Radar sweep scanner that reveals edges
 * Creates the Odradek BT detector visual from Death Stranding
 */

import type { OdradekParams } from '../../../stores/strandStore'

let sweepAngle = 0
let pingTrails: { angle: number; time: number; intensity: number }[] = []

export function renderOdradek(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: OdradekParams,
  time: number,
  deltaTime: number
): void {
  const { sweepSpeed, revealDuration, pingIntensity } = params

  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.hypot(width, height) / 2

  // Update sweep angle
  sweepAngle += sweepSpeed * deltaTime * 2

  // Get source for edge detection
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Simple edge detection
  const edges = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const iL = (y * width + (x - 1)) * 4
      const iR = (y * width + (x + 1)) * 4
      const iU = ((y - 1) * width + x) * 4
      const iD = ((y + 1) * width + x) * 4

      const gx = Math.abs(src[iR] - src[iL])
      const gy = Math.abs(src[iD] - src[iU])
      edges[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 100)
    }
  }

  // Add new ping trail at current sweep position
  if (Math.random() < 0.3) {
    pingTrails.push({ angle: sweepAngle, time: time, intensity: pingIntensity })
  }

  // Remove old trails
  pingTrails = pingTrails.filter(p => time - p.time < revealDuration * 2)

  ctx.save()

  // Draw sweep cone
  const sweepWidth = 0.3 // radians
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.arc(centerX, centerY, maxRadius, sweepAngle - sweepWidth, sweepAngle)
  ctx.closePath()

  const sweepGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)
  sweepGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)')
  sweepGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)')
  sweepGradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
  ctx.fillStyle = sweepGradient
  ctx.fill()

  // Draw sweep line
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(
    centerX + Math.cos(sweepAngle) * maxRadius,
    centerY + Math.sin(sweepAngle) * maxRadius
  )
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Reveal edges in sweep area
  ctx.globalCompositeOperation = 'screen'

  for (const ping of pingTrails) {
    const age = time - ping.time
    const fadeAlpha = Math.max(0, 1 - age / (revealDuration * 2))

    // Draw edges that were in this ping's sweep area
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const edge = edges[y * width + x]
        if (edge < 0.1) continue

        const dx = x - centerX
        const dy = y - centerY
        const pixelAngle = Math.atan2(dy, dx)

        // Check if pixel was in sweep cone when ping occurred
        let angleDiff = pixelAngle - ping.angle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

        if (Math.abs(angleDiff) < sweepWidth) {
          const alpha = edge * fadeAlpha * ping.intensity
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`
          ctx.fillRect(x, y, 3, 3)
        }
      }
    }
  }

  // Draw center indicator
  ctx.globalCompositeOperation = 'source-over'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'
  ctx.fill()

  // Rotating arms
  for (let i = 0; i < 4; i++) {
    const armAngle = sweepAngle * 0.5 + (Math.PI / 2) * i
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + Math.cos(armAngle) * 15,
      centerY + Math.sin(armAngle) * 15
    )
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.restore()
}

export function resetOdradek(): void {
  sweepAngle = 0
  pingTrails = []
}
