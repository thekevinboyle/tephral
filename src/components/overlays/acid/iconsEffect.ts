/**
 * iconsEffect.ts
 * Emoji/symbols in grid pattern with rotation based on brightness
 * Inspired by TouchDesigner particle systems
 */

export interface IconsParams {
  gridSize: number
  iconSet: 'tech' | 'nature' | 'abstract' | 'faces'
  rotation: number
  colorMode: 'mono' | 'tint' | 'original'
}

const ICON_SETS = {
  tech: ['⚙️', '💻', '📱', '🔧', '⚡', '🔌', '💾', '🖥️'],
  nature: ['🌿', '🌸', '🌊', '🔥', '⭐', '🌙', '☀️', '🌈'],
  abstract: ['◉', '◎', '⊕', '⊗', '⊙', '⊚', '⊛', '⊜'],
  faces: ['😀', '😎', '🤖', '👾', '💀', '👽', '🎭', '🤡'],
}

export function renderIcons(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: IconsParams
): void {
  const { gridSize, iconSet, rotation, colorMode } = params

  // Background handled by AcidOverlay based on preserveVideo setting

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  const icons = ICON_SETS[iconSet]
  const iconCount = icons.length
  const halfGrid = gridSize / 2

  // Set font size
  destCtx.font = `${gridSize * 0.8}px sans-serif`
  destCtx.textAlign = 'center'
  destCtx.textBaseline = 'middle'

  // Iterate over grid cells
  for (let y = halfGrid; y < height; y += gridSize) {
    for (let x = halfGrid; x < width; x += gridSize) {
      // Sample pixel at grid center
      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      // Get pixel color
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]

      // Calculate brightness (0-1)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Skip very dark pixels
      if (brightness < 0.1) continue

      // Select icon based on brightness
      const iconIndex = Math.min(
        Math.floor(brightness * iconCount),
        iconCount - 1
      )
      const icon = icons[iconIndex]

      // Calculate rotation angle
      const angle = brightness * rotation * Math.PI * 2

      // Set fill style based on color mode
      switch (colorMode) {
        case 'mono':
          destCtx.fillStyle = '#fff'
          break
        case 'tint':
          // Tint with source color at high saturation
          destCtx.fillStyle = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`
          break
        case 'original':
          destCtx.fillStyle = `rgb(${r}, ${g}, ${b})`
          break
      }

      // Save context, apply rotation, draw icon
      destCtx.save()
      destCtx.translate(x, y)
      destCtx.rotate(angle)
      destCtx.fillText(icon, 0, 0)
      destCtx.restore()
    }
  }
}
