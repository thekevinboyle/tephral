/**
 * decompEffect.ts
 * Quad-tree decomposition - variable sized rectangles based on image variance
 * Inspired by data compression visualization
 */

export interface DecompParams {
  minBlock: number
  maxBlock: number
  threshold: number
  showGrid: boolean
  fillMode: 'solid' | 'average' | 'original'
}

interface Block {
  x: number
  y: number
  width: number
  height: number
  avgR: number
  avgG: number
  avgB: number
  variance: number
}

function calculateBlockStats(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  x: number,
  y: number,
  width: number,
  height: number
): { avgR: number; avgG: number; avgB: number; variance: number } {
  let sumR = 0,
    sumG = 0,
    sumB = 0
  let sumSqR = 0,
    sumSqG = 0,
    sumSqB = 0
  let count = 0

  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      const idx = (py * imageWidth + px) * 4
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]

      sumR += r
      sumG += g
      sumB += b
      sumSqR += r * r
      sumSqG += g * g
      sumSqB += b * b
      count++
    }
  }

  const avgR = sumR / count
  const avgG = sumG / count
  const avgB = sumB / count

  // Variance across all channels
  const varR = sumSqR / count - avgR * avgR
  const varG = sumSqG / count - avgG * avgG
  const varB = sumSqB / count - avgB * avgB
  const variance = (varR + varG + varB) / 3

  return { avgR, avgG, avgB, variance }
}

function subdivide(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  minBlock: number,
  maxBlock: number,
  threshold: number,
  blocks: Block[]
): void {
  const stats = calculateBlockStats(pixels, imageWidth, x, y, width, height)

  // Check if we should subdivide
  const shouldSubdivide =
    stats.variance > threshold && width > minBlock && height > minBlock

  if (shouldSubdivide && width >= minBlock * 2 && height >= minBlock * 2) {
    // Subdivide into 4 quadrants
    const halfW = Math.floor(width / 2)
    const halfH = Math.floor(height / 2)

    subdivide(
      pixels,
      imageWidth,
      x,
      y,
      halfW,
      halfH,
      minBlock,
      maxBlock,
      threshold,
      blocks
    )
    subdivide(
      pixels,
      imageWidth,
      x + halfW,
      y,
      width - halfW,
      halfH,
      minBlock,
      maxBlock,
      threshold,
      blocks
    )
    subdivide(
      pixels,
      imageWidth,
      x,
      y + halfH,
      halfW,
      height - halfH,
      minBlock,
      maxBlock,
      threshold,
      blocks
    )
    subdivide(
      pixels,
      imageWidth,
      x + halfW,
      y + halfH,
      width - halfW,
      height - halfH,
      minBlock,
      maxBlock,
      threshold,
      blocks
    )
  } else {
    // Add this block
    blocks.push({
      x,
      y,
      width,
      height,
      avgR: stats.avgR,
      avgG: stats.avgG,
      avgB: stats.avgB,
      variance: stats.variance,
    })
  }
}

export function renderDecomp(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: DecompParams
): void {
  const { minBlock, maxBlock, threshold, showGrid, fillMode } = params

  // Black background
  destCtx.fillStyle = '#000'
  destCtx.fillRect(0, 0, width, height)

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Build quad-tree decomposition
  const blocks: Block[] = []

  // Start with blocks at maxBlock size
  for (let y = 0; y < height; y += maxBlock) {
    for (let x = 0; x < width; x += maxBlock) {
      const blockW = Math.min(maxBlock, width - x)
      const blockH = Math.min(maxBlock, height - y)
      subdivide(
        pixels,
        width,
        x,
        y,
        blockW,
        blockH,
        minBlock,
        maxBlock,
        threshold,
        blocks
      )
    }
  }

  // Draw blocks
  for (const block of blocks) {
    switch (fillMode) {
      case 'solid':
        // Brightness-based white
        const brightness =
          (block.avgR * 0.299 + block.avgG * 0.587 + block.avgB * 0.114) / 255
        destCtx.fillStyle = `rgba(255, 255, 255, ${brightness})`
        break
      case 'average':
        destCtx.fillStyle = `rgb(${Math.round(block.avgR)}, ${Math.round(block.avgG)}, ${Math.round(block.avgB)})`
        break
      case 'original':
        // Draw original image section
        destCtx.drawImage(
          sourceCtx.canvas,
          block.x,
          block.y,
          block.width,
          block.height,
          block.x,
          block.y,
          block.width,
          block.height
        )
        continue
    }

    destCtx.fillRect(block.x, block.y, block.width, block.height)
  }

  // Draw grid lines if enabled
  if (showGrid) {
    destCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    destCtx.lineWidth = 1

    for (const block of blocks) {
      destCtx.strokeRect(block.x, block.y, block.width, block.height)
    }
  }
}
