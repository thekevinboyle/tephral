/**
 * seamEffect.ts
 * Vertical rift/tear splitting the image
 * Creates the "seam between worlds" visual from Death Stranding
 */

import type { SeamParams } from '../../../stores/strandStore'

export function renderSeam(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: SeamParams,
  time: number
): void {
  const { riftWidth, parallaxAmount, edgeDistort } = params

  const centerX = width / 2
  const gapWidth = riftWidth * width * 0.2

  // Get source image
  const sourceData = sourceCtx.getImageData(0, 0, width, height)

  // Clear and draw void in the gap
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // Add some noise/particles in the void
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < 50; i++) {
    const x = centerX - gapWidth / 2 + Math.random() * gapWidth
    const y = Math.random() * height
    const size = 1 + Math.random() * 2
    const alpha = 0.1 + Math.random() * 0.2

    ctx.fillStyle = `rgba(100, 50, 150, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Draw left side of image (shifted left with parallax)
  const leftOffset = -gapWidth / 2 - parallaxAmount * 20
  drawSplitSide(ctx, sourceData, width, height, 'left', centerX, gapWidth, leftOffset, edgeDistort, time)

  // Draw right side of image (shifted right with parallax)
  const rightOffset = gapWidth / 2 + parallaxAmount * 20
  drawSplitSide(ctx, sourceData, width, height, 'right', centerX, gapWidth, rightOffset, edgeDistort, time)

  // Draw rift edge effects
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  // Left edge glow
  const leftEdgeX = centerX - gapWidth / 2 + leftOffset
  const leftGradient = ctx.createLinearGradient(leftEdgeX - 30, 0, leftEdgeX, 0)
  leftGradient.addColorStop(0, 'rgba(100, 50, 150, 0)')
  leftGradient.addColorStop(1, 'rgba(150, 100, 200, 0.4)')
  ctx.fillStyle = leftGradient
  ctx.fillRect(leftEdgeX - 30, 0, 30, height)

  // Right edge glow
  const rightEdgeX = centerX + gapWidth / 2 + rightOffset
  const rightGradient = ctx.createLinearGradient(rightEdgeX, 0, rightEdgeX + 30, 0)
  rightGradient.addColorStop(0, 'rgba(150, 100, 200, 0.4)')
  rightGradient.addColorStop(1, 'rgba(100, 50, 150, 0)')
  ctx.fillStyle = rightGradient
  ctx.fillRect(rightEdgeX, 0, 30, height)

  // Animated energy along edges
  for (let y = 0; y < height; y += 10) {
    const wave = Math.sin(y * 0.05 + time * 3) * edgeDistort * 10
    const alpha = 0.3 + Math.sin(y * 0.1 + time * 5) * 0.2

    ctx.fillStyle = `rgba(200, 150, 255, ${alpha})`
    ctx.fillRect(leftEdgeX + wave - 2, y, 4, 5)
    ctx.fillRect(rightEdgeX - wave - 2, y, 4, 5)
  }

  ctx.restore()
}

function drawSplitSide(
  ctx: CanvasRenderingContext2D,
  sourceData: ImageData,
  width: number,
  height: number,
  side: 'left' | 'right',
  centerX: number,
  gapWidth: number,
  offset: number,
  edgeDistort: number,
  time: number
): void {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')!

  // Put source data on temp canvas
  tempCtx.putImageData(sourceData, 0, 0)

  // Calculate clip region
  ctx.save()
  ctx.beginPath()

  if (side === 'left') {
    // Left side - from left edge to center with distortion
    ctx.moveTo(0, 0)
    for (let y = 0; y <= height; y += 5) {
      const distort = Math.sin(y * 0.03 + time * 2) * edgeDistort * 15
      ctx.lineTo(centerX - gapWidth / 2 + offset + distort, y)
    }
    ctx.lineTo(0, height)
    ctx.closePath()
  } else {
    // Right side - from center to right edge with distortion
    ctx.moveTo(width, 0)
    for (let y = 0; y <= height; y += 5) {
      const distort = Math.sin(y * 0.03 + time * 2) * edgeDistort * 15
      ctx.lineTo(centerX + gapWidth / 2 + offset + distort, y)
    }
    ctx.lineTo(width, height)
    ctx.closePath()
  }

  ctx.clip()

  // Draw the source with offset
  ctx.drawImage(tempCanvas, offset, 0)

  ctx.restore()
}
