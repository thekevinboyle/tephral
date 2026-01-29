/**
 * bridgeLinkEffect.ts
 * Hexagonal grid overlay that responds to edges
 * Creates the infrastructure network visual from Death Stranding
 */

import type { BridgeLinkParams } from '../../../stores/strandStore'

export function renderBridgeLink(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: BridgeLinkParams,
  time: number
): void {
  const { gridSize, edgeSensitivity, opacity } = params

  // Get source for edge detection
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const src = sourceData.data

  // Simple edge detection using Sobel-like approach (downsampled)
  const edgeMap = new Float32Array(Math.ceil(width / gridSize) * Math.ceil(height / gridSize))

  const hexWidth = gridSize
  const hexHeight = gridSize * 0.866 // sqrt(3)/2

  // Calculate edge intensity for grid cells
  for (let gy = 0; gy < height / gridSize; gy++) {
    for (let gx = 0; gx < width / gridSize; gx++) {
      let edgeSum = 0
      let count = 0

      const cx = Math.floor((gx + 0.5) * gridSize)
      const cy = Math.floor((gy + 0.5) * gridSize)

      // Sample edges around center
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx * 4
          const y = cy + dy * 4
          if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            const iLeft = (y * width + (x - 1)) * 4
            const iRight = (y * width + (x + 1)) * 4
            const iUp = ((y - 1) * width + x) * 4
            const iDown = ((y + 1) * width + x) * 4

            const gradX = Math.abs(src[iRight] - src[iLeft])
            const gradY = Math.abs(src[iDown] - src[iUp])
            edgeSum += Math.sqrt(gradX * gradX + gradY * gradY) / 255
            count++
          }
        }
      }

      edgeMap[gy * Math.ceil(width / gridSize) + gx] = count > 0 ? edgeSum / count : 0
    }
  }

  // Draw hexagonal grid
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (let row = 0; row < height / hexHeight + 1; row++) {
    for (let col = 0; col < width / hexWidth + 1; col++) {
      const isOffset = row % 2 === 1
      const x = col * hexWidth + (isOffset ? hexWidth / 2 : 0)
      const y = row * hexHeight

      // Get edge intensity for this hex
      const gx = Math.floor(x / gridSize)
      const gy = Math.floor(y / gridSize)
      const edgeIdx = gy * Math.ceil(width / gridSize) + gx
      const edgeIntensity = edgeMap[edgeIdx] || 0

      // Calculate glow based on edge intensity
      const glow = Math.min(1, edgeIntensity * edgeSensitivity * 5)
      const baseAlpha = opacity * 0.2
      const glowAlpha = opacity * glow * 0.8

      // Animated pulse
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 + x * 0.01 + y * 0.01)

      ctx.strokeStyle = `rgba(0, 212, 255, ${baseAlpha + glowAlpha * pulse})`
      ctx.lineWidth = 0.5 + glow * 1.5

      drawHexagon(ctx, x, y, hexWidth / 2 * 0.9)
    }
  }

  ctx.restore()
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + size * Math.cos(angle)
    const y = cy + size * Math.sin(angle)
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.stroke()
}
