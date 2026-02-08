/**
 * glyphEffect.ts
 * Unicode symbols based on brightness
 * Inspired by ASCII art and data visualization aesthetics
 */

export interface GlyphParams {
  gridSize: number
  charset: 'geometric' | 'arrows' | 'blocks' | 'math'
  density: number
  invert: boolean
}

const CHARSETS = {
  geometric: ['⬢', '◯', '▲', '◼', '◆', '●', '■', '▶'],
  arrows: ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'],
  blocks: ['█', '▓', '▒', '░', '▄', '▀', '▌', '▐'],
  math: ['+', '×', '÷', '=', '≠', '≈', '∞', '∑'],
}

export function renderGlyphs(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: GlyphParams
): void {
  const { gridSize, charset, density, invert } = params

  // Background handled by AcidOverlay based on preserveVideo setting

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // White text
  destCtx.fillStyle = '#fff'
  destCtx.font = `${gridSize}px monospace`
  destCtx.textAlign = 'center'
  destCtx.textBaseline = 'middle'

  const chars = CHARSETS[charset]
  const charCount = chars.length
  const halfGrid = gridSize / 2

  // Iterate over grid cells
  for (let y = halfGrid; y < height; y += gridSize) {
    for (let x = halfGrid; x < width; x += gridSize) {
      // Sample pixel at grid center
      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      // Calculate brightness (0-1)
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Apply inversion
      if (invert) {
        brightness = 1 - brightness
      }

      // Skip based on density threshold
      if (brightness < 1 - density) continue

      // Map brightness to character index
      const charIndex = Math.min(
        Math.floor(brightness * charCount),
        charCount - 1
      )
      const char = chars[charIndex]

      destCtx.fillText(char, x, y)
    }
  }
}
