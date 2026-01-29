/**
 * handprintsEffect.ts
 * Black handprint marks that fade in/out at random positions
 * Creates the BT presence feeling from Death Stranding
 */

import type { HandprintsParams } from '../../../stores/strandStore'

interface Handprint {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  phase: 'in' | 'hold' | 'out'
  timer: number
  isLeft: boolean
}

let handprints: Handprint[] = []
let lastSpawnTime = 0

export function renderHandprints(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: HandprintsParams,
  time: number,
  deltaTime: number
): void {
  const { density, fadeSpeed, size } = params

  // Spawn new handprints periodically
  const spawnInterval = 1 / (density * 0.5)
  if (time - lastSpawnTime > spawnInterval && handprints.length < density) {
    lastSpawnTime = time
    handprints.push({
      x: Math.random() * width,
      y: Math.random() * height,
      rotation: (Math.random() - 0.5) * 0.5,
      scale: 0.5 + Math.random() * 0.5,
      opacity: 0,
      phase: 'in',
      timer: 0,
      isLeft: Math.random() > 0.5,
    })
  }

  // Update and render handprints
  const fadeDuration = 0.5 / fadeSpeed
  const holdDuration = 1 / fadeSpeed

  handprints = handprints.filter(hp => {
    hp.timer += deltaTime

    // Update phase and opacity
    if (hp.phase === 'in') {
      hp.opacity = Math.min(1, hp.timer / fadeDuration)
      if (hp.timer >= fadeDuration) {
        hp.phase = 'hold'
        hp.timer = 0
      }
    } else if (hp.phase === 'hold') {
      hp.opacity = 1
      if (hp.timer >= holdDuration) {
        hp.phase = 'out'
        hp.timer = 0
      }
    } else if (hp.phase === 'out') {
      hp.opacity = Math.max(0, 1 - hp.timer / fadeDuration)
      if (hp.timer >= fadeDuration) {
        return false // Remove this handprint
      }
    }

    // Draw handprint
    const handSize = 60 * size * hp.scale
    ctx.save()
    ctx.translate(hp.x, hp.y)
    ctx.rotate(hp.rotation)
    if (hp.isLeft) ctx.scale(-1, 1)
    ctx.globalAlpha = hp.opacity * 0.7

    // Draw simplified hand shape
    ctx.fillStyle = '#000000'

    // Palm
    ctx.beginPath()
    ctx.ellipse(0, 0, handSize * 0.4, handSize * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Fingers
    const fingerWidth = handSize * 0.12
    const fingerPositions = [
      { x: -handSize * 0.25, y: -handSize * 0.5, len: handSize * 0.5, angle: -0.2 },
      { x: -handSize * 0.08, y: -handSize * 0.55, len: handSize * 0.6, angle: -0.05 },
      { x: handSize * 0.08, y: -handSize * 0.55, len: handSize * 0.55, angle: 0.05 },
      { x: handSize * 0.25, y: -handSize * 0.5, len: handSize * 0.45, angle: 0.2 },
      { x: handSize * 0.4, y: -handSize * 0.1, len: handSize * 0.35, angle: 0.8 }, // Thumb
    ]

    for (const finger of fingerPositions) {
      ctx.save()
      ctx.translate(finger.x, finger.y)
      ctx.rotate(finger.angle)
      ctx.beginPath()
      ctx.ellipse(0, -finger.len / 2, fingerWidth, finger.len / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
    return true
  })
}
