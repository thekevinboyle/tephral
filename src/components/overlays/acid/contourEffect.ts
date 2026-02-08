/**
 * contourEffect.ts
 * Flowing parallel lines following luminance contours (like topographic maps)
 * Uses marching squares algorithm to find iso-lines
 */

export interface ContourParams {
  levels: number
  lineWidth: number
  smooth: number
  animate: boolean
}

// Marching squares lookup table for edge configurations
const EDGE_TABLE = [
  [], // 0
  [[0, 3]], // 1
  [[0, 1]], // 2
  [[1, 3]], // 3
  [[1, 2]], // 4
  [[0, 1], [2, 3]], // 5 - saddle
  [[0, 2]], // 6
  [[2, 3]], // 7
  [[2, 3]], // 8
  [[0, 2]], // 9
  [[0, 3], [1, 2]], // 10 - saddle
  [[1, 2]], // 11
  [[1, 3]], // 12
  [[0, 1]], // 13
  [[0, 3]], // 14
  [], // 15
]

// Edge midpoint positions (relative to cell)
function getEdgeMidpoint(
  edge: number,
  x: number,
  y: number,
  cellSize: number,
  t: number
): [number, number] {
  switch (edge) {
    case 0: // top edge
      return [x + cellSize * t, y]
    case 1: // right edge
      return [x + cellSize, y + cellSize * t]
    case 2: // bottom edge
      return [x + cellSize * (1 - t), y + cellSize]
    case 3: // left edge
      return [x, y + cellSize * (1 - t)]
    default:
      return [x, y]
  }
}

export function renderContour(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ContourParams,
  preserveVideo: boolean = false
): void {
  const { levels, lineWidth, smooth, animate } = params

  // Only fill black background if not preserving video
  if (!preserveVideo) {
    destCtx.fillStyle = '#000'
    destCtx.fillRect(0, 0, width, height)
  }

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Cell size for marching squares grid
  const cellSize = Math.max(4, Math.floor(smooth * 2 + 2))
  const cols = Math.ceil(width / cellSize)
  const rows = Math.ceil(height / cellSize)

  // Create brightness grid
  const brightnessGrid: number[][] = []
  for (let row = 0; row <= rows; row++) {
    brightnessGrid[row] = []
    for (let col = 0; col <= cols; col++) {
      const px = Math.min(col * cellSize, width - 1)
      const py = Math.min(row * cellSize, height - 1)
      const idx = (Math.floor(py) * width + Math.floor(px)) * 4

      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      brightnessGrid[row][col] = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    }
  }

  // Apply smoothing if needed
  if (smooth > 0) {
    for (let pass = 0; pass < smooth; pass++) {
      for (let row = 1; row < rows; row++) {
        for (let col = 1; col < cols; col++) {
          brightnessGrid[row][col] =
            (brightnessGrid[row - 1][col] +
              brightnessGrid[row + 1][col] +
              brightnessGrid[row][col - 1] +
              brightnessGrid[row][col + 1] +
              brightnessGrid[row][col] * 4) /
            8
        }
      }
    }
  }

  // Animation offset
  const animOffset = animate ? (Date.now() * 0.001) % 1 : 0

  // Draw contour lines
  destCtx.strokeStyle = '#fff'
  destCtx.lineWidth = lineWidth
  destCtx.lineCap = 'round'
  destCtx.lineJoin = 'round'

  // Draw iso-lines for each level
  for (let level = 1; level < levels; level++) {
    const threshold = (level + animOffset) / levels

    destCtx.beginPath()

    // March through grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Get corner values
        const tl = brightnessGrid[row][col]
        const tr = brightnessGrid[row][col + 1]
        const br = brightnessGrid[row + 1][col + 1]
        const bl = brightnessGrid[row + 1][col]

        // Calculate case index (which corners are above threshold)
        let caseIndex = 0
        if (tl > threshold) caseIndex |= 1
        if (tr > threshold) caseIndex |= 2
        if (br > threshold) caseIndex |= 4
        if (bl > threshold) caseIndex |= 8

        // Get edges to draw
        const edges = EDGE_TABLE[caseIndex]

        // Draw line segments for this cell
        for (const edge of edges) {
          const x = col * cellSize
          const y = row * cellSize

          // Interpolation factors for smoother lines
          const t1 = 0.5 // Could interpolate based on exact threshold crossing
          const t2 = 0.5

          const [x1, y1] = getEdgeMidpoint(edge[0], x, y, cellSize, t1)
          const [x2, y2] = getEdgeMidpoint(edge[1], x, y, cellSize, t2)

          destCtx.moveTo(x1, y1)
          destCtx.lineTo(x2, y2)
        }
      }
    }

    destCtx.stroke()
  }
}
