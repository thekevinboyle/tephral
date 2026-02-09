/**
 * hexEffect.ts
 * Hexagonal honeycomb mosaic grid
 * Creates a tessellated hex pattern filled with sampled colors
 */

export interface HexParams {
  cellSize: number
  fillMode: 'average' | 'center' | 'original'
  showEdges: boolean
  rotation: number
}

export function renderHex(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: HexParams
): void {
  const { cellSize, fillMode, showEdges, rotation } = params

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Hex geometry
  const hexHeight = cellSize * 2
  const hexWidth = Math.sqrt(3) * cellSize
  const vertDist = hexHeight * 0.75
  const horizDist = hexWidth

  // Apply rotation
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // Calculate how many hexes we need to cover the canvas (with rotation buffer)
  const diagonal = Math.sqrt(width * width + height * height)
  const cols = Math.ceil(diagonal / horizDist) + 2
  const rows = Math.ceil(diagonal / vertDist) + 2

  // Center offset
  const startX = width / 2 - (cols * horizDist) / 2
  const startY = height / 2 - (rows * vertDist) / 2

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      // Hex center before rotation
      const offsetX = (row % 2) * (horizDist / 2)
      const hx = startX + col * horizDist + offsetX
      const hy = startY + row * vertDist

      // Apply rotation around canvas center
      const dx = hx - width / 2
      const dy = hy - height / 2
      const centerX = dx * cos - dy * sin + width / 2
      const centerY = dx * sin + dy * cos + height / 2

      // Get color for this hex
      const color = getHexColor(pixels, width, height, centerX, centerY, cellSize, fillMode)
      if (!color) continue

      // Draw the hexagon
      drawHexagon(destCtx, centerX, centerY, cellSize, rotation, color, showEdges)
    }
  }
}

function getHexColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  cellSize: number,
  fillMode: string
): string | null {
  if (fillMode === 'center') {
    // Sample at center only
    const px = Math.floor(centerX)
    const py = Math.floor(centerY)
    if (px < 0 || px >= width || py < 0 || py >= height) return null
    const idx = (py * width + px) * 4
    return `rgb(${pixels[idx]}, ${pixels[idx + 1]}, ${pixels[idx + 2]})`
  }

  if (fillMode === 'average') {
    // Sample multiple points within hex and average
    let r = 0, g = 0, b = 0, count = 0
    const sampleRadius = cellSize * 0.7
    const samples = 7 // Center + 6 hex corners

    for (let i = 0; i < samples; i++) {
      let sx = centerX
      let sy = centerY
      if (i > 0) {
        const angle = ((i - 1) * Math.PI) / 3
        sx = centerX + Math.cos(angle) * sampleRadius * 0.5
        sy = centerY + Math.sin(angle) * sampleRadius * 0.5
      }

      const px = Math.floor(sx)
      const py = Math.floor(sy)
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4
        r += pixels[idx]
        g += pixels[idx + 1]
        b += pixels[idx + 2]
        count++
      }
    }

    if (count === 0) return null
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`
  }

  // Original - just return white, actual image shown via preserveVideo
  const px = Math.floor(centerX)
  const py = Math.floor(centerY)
  if (px < 0 || px >= width || py < 0 || py >= height) return null
  const idx = (py * width + px) * 4
  const brightness = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255
  const gray = Math.round(brightness * 255)
  return `rgb(${gray}, ${gray}, ${gray})`
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  rotation: number,
  fillColor: string,
  showEdges: boolean
): void {
  const rad = (rotation * Math.PI) / 180

  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + rad - Math.PI / 6
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()

  ctx.fillStyle = fillColor
  ctx.fill()

  if (showEdges) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
