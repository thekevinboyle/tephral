/**
 * thgridEffect.ts
 * Harsh B&W threshold with geometric grid overlay
 * Inspired by technical drawings and registration marks
 */

export interface ThGridParams {
  threshold: number
  gridSize: number
  lineWidth: number
  invert: boolean
  cornerMarks: boolean
}

export function renderThGrid(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ThGridParams
): void {
  const { threshold, gridSize, lineWidth, invert, cornerMarks } = params

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Create output image data
  const outputData = destCtx.createImageData(width, height)
  const output = outputData.data

  // Apply threshold
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

    let isWhite = brightness > threshold
    if (invert) isWhite = !isWhite

    const value = isWhite ? 255 : 0
    output[i] = value
    output[i + 1] = value
    output[i + 2] = value
    output[i + 3] = 255
  }

  // Draw thresholded image
  destCtx.putImageData(outputData, 0, 0)

  // Draw grid overlay
  destCtx.strokeStyle = invert ? '#000' : '#fff'
  destCtx.lineWidth = lineWidth
  destCtx.globalAlpha = 0.5

  // Vertical lines
  for (let x = gridSize; x < width; x += gridSize) {
    destCtx.beginPath()
    destCtx.moveTo(x, 0)
    destCtx.lineTo(x, height)
    destCtx.stroke()
  }

  // Horizontal lines
  for (let y = gridSize; y < height; y += gridSize) {
    destCtx.beginPath()
    destCtx.moveTo(0, y)
    destCtx.lineTo(width, y)
    destCtx.stroke()
  }

  destCtx.globalAlpha = 1

  // Draw corner marks at intersections
  if (cornerMarks) {
    const markSize = Math.min(gridSize * 0.2, 10)
    destCtx.strokeStyle = invert ? '#000' : '#fff'
    destCtx.lineWidth = Math.max(1, lineWidth * 0.5)

    for (let x = gridSize; x < width; x += gridSize) {
      for (let y = gridSize; y < height; y += gridSize) {
        // Top-left bracket
        destCtx.beginPath()
        destCtx.moveTo(x - markSize, y - markSize * 0.3)
        destCtx.lineTo(x - markSize, y - markSize)
        destCtx.lineTo(x - markSize * 0.3, y - markSize)
        destCtx.stroke()

        // Top-right bracket
        destCtx.beginPath()
        destCtx.moveTo(x + markSize, y - markSize * 0.3)
        destCtx.lineTo(x + markSize, y - markSize)
        destCtx.lineTo(x + markSize * 0.3, y - markSize)
        destCtx.stroke()

        // Bottom-left bracket
        destCtx.beginPath()
        destCtx.moveTo(x - markSize, y + markSize * 0.3)
        destCtx.lineTo(x - markSize, y + markSize)
        destCtx.lineTo(x - markSize * 0.3, y + markSize)
        destCtx.stroke()

        // Bottom-right bracket
        destCtx.beginPath()
        destCtx.moveTo(x + markSize, y + markSize * 0.3)
        destCtx.lineTo(x + markSize, y + markSize)
        destCtx.lineTo(x + markSize * 0.3, y + markSize)
        destCtx.stroke()
      }
    }
  }
}
