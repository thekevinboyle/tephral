/**
 * scanEffect.ts
 * Radar/scanning line sweep effect
 * Creates an animated scan line with trailing glow
 */

export interface ScanParams {
  speed: number
  width: number
  direction: 'horizontal' | 'vertical' | 'radial'
  trail: number
}

// Track animation state
let scanPhase = 0

export function renderScan(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ScanParams,
  deltaTime: number = 16
): void {
  const { speed, width: lineWidth, direction, trail } = params

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Update animation phase (0-1 cycle)
  scanPhase += (speed * deltaTime) / 2000
  if (scanPhase > 1) scanPhase -= 1

  if (direction === 'radial') {
    renderRadialScan(destCtx, pixels, width, height, lineWidth, trail)
  } else {
    renderLinearScan(destCtx, pixels, width, height, lineWidth, trail, direction)
  }
}

function renderLinearScan(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  lineWidth: number,
  trail: number,
  direction: 'horizontal' | 'vertical'
): void {
  const isHorizontal = direction === 'horizontal'
  const maxPos = isHorizontal ? height : width
  const scanPos = scanPhase * maxPos

  // Draw the scan line region with brightness-based reveal
  for (let i = 0; i < maxPos; i++) {
    // Calculate distance from scan line
    let dist = i - scanPos
    if (dist < 0) dist += maxPos // Wrap around

    // Trail falloff
    const trailLength = maxPos * trail
    let alpha = 0
    if (dist < lineWidth) {
      alpha = 1.0  // Full brightness at scan line
    } else if (dist < lineWidth + trailLength) {
      alpha = 1 - (dist - lineWidth) / trailLength
      alpha = Math.pow(alpha, 2) // Exponential falloff
    }

    if (alpha <= 0.01) continue

    // Draw the line of pixels
    const perpSize = isHorizontal ? width : height
    for (let j = 0; j < perpSize; j++) {
      const x = isHorizontal ? j : i
      const y = isHorizontal ? i : j
      const idx = (y * width + x) * 4

      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Brighten at the scan line position
      const scanBoost = dist < lineWidth ? 1.5 : 1.0
      const finalBrightness = Math.min(1, brightness * alpha * scanBoost)

      if (finalBrightness > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${finalBrightness})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  // Draw bright scan line indicator
  ctx.fillStyle = `rgba(255, 255, 255, 0.8)`
  if (isHorizontal) {
    ctx.fillRect(0, scanPos - 1, width, 2)
  } else {
    ctx.fillRect(scanPos - 1, 0, 2, height)
  }
}

function renderRadialScan(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  lineWidth: number,
  trail: number
): void {
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)
  const scanAngle = scanPhase * Math.PI * 2

  // Angular width and trail
  const angularWidth = (lineWidth / 180) * Math.PI
  const trailAngle = trail * Math.PI

  // Sample in polar coordinates
  const radiusStep = 2
  const angleStep = Math.PI / 180  // 1 degree

  for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
    // Calculate angular distance from scan line
    let angleDist = angle - scanAngle
    while (angleDist < 0) angleDist += Math.PI * 2
    while (angleDist > Math.PI * 2) angleDist -= Math.PI * 2

    // Trail falloff
    let alpha = 0
    if (angleDist < angularWidth) {
      alpha = 1.0
    } else if (angleDist < angularWidth + trailAngle) {
      alpha = 1 - (angleDist - angularWidth) / trailAngle
      alpha = Math.pow(alpha, 2)
    }

    if (alpha <= 0.01) continue

    for (let r = 0; r < maxRadius; r += radiusStep) {
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r

      if (x < 0 || x >= width || y < 0 || y >= height) continue

      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      const red = pixels[idx]
      const green = pixels[idx + 1]
      const blue = pixels[idx + 2]
      const brightness = (red * 0.299 + green * 0.587 + blue * 0.114) / 255

      const scanBoost = angleDist < angularWidth ? 1.5 : 1.0
      const finalBrightness = Math.min(1, brightness * alpha * scanBoost)

      if (finalBrightness > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${finalBrightness})`
        ctx.fillRect(px, py, 2, 2)
      }
    }
  }

  // Draw scan line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(
    centerX + Math.cos(scanAngle) * maxRadius,
    centerY + Math.sin(scanAngle) * maxRadius
  )
  ctx.stroke()

  // Center dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
  ctx.fill()
}

// Reset function for when effect is toggled off/on
export function resetScan(): void {
  scanPhase = 0
}
