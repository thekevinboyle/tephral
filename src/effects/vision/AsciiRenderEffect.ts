// ASCII rendering is better done with Canvas2D for crisp text
// This module provides the rendering logic to be used in a canvas overlay

import type { AsciiRenderParams } from '../../stores/asciiRenderStore'
import { ASCII_CHAR_SETS } from '../../stores/asciiRenderStore'

export interface MatrixColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  opacity: number
}

export class AsciiRenderer {
  private params: AsciiRenderParams
  private matrixColumns: MatrixColumn[] = []

  constructor(params: AsciiRenderParams) {
    this.params = params
  }

  updateParams(params: AsciiRenderParams) {
    this.params = params
  }

  // Initialize matrix columns
  initMatrix(width: number, height: number) {
    const colCount = Math.floor(width / this.params.fontSize)
    this.matrixColumns = []

    for (let i = 0; i < colCount; i++) {
      if (Math.random() < this.params.matrixDensity) {
        this.matrixColumns.push({
          x: i * this.params.fontSize,
          y: Math.random() * height,
          speed: 0.5 + Math.random() * 1.5,
          chars: this.generateMatrixChars(),
          opacity: 0.5 + Math.random() * 0.5,
        })
      }
    }
  }

  private generateMatrixChars(): string[] {
    const chars = ASCII_CHAR_SETS.matrix
    const length = this.params.matrixTrailLength
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)])
  }

  // Render ASCII art from image data
  renderAscii(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData,
    width: number,
    height: number
  ) {
    const { fontSize, resolution, contrast, invert, colorMode, monoColor, mode } = this.params
    const chars = mode === 'standard' && this.params.customChars
      ? this.params.customChars
      : ASCII_CHAR_SETS[mode]

    ctx.fillStyle = this.params.backgroundColor
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'

    const cellW = resolution
    const cellH = resolution
    const cols = Math.floor(width / cellW)
    const rows = Math.floor(height / cellH)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Sample pixel at cell center
        const px = Math.floor((col + 0.5) * cellW)
        const py = Math.floor((row + 0.5) * cellH)
        const idx = (py * imageData.width + px) * 4

        const r = imageData.data[idx] || 0
        const g = imageData.data[idx + 1] || 0
        const b = imageData.data[idx + 2] || 0

        // Calculate brightness
        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        brightness = (brightness - 0.5) * contrast + 0.5
        brightness = Math.max(0, Math.min(1, brightness))

        if (invert) brightness = 1 - brightness

        // Map to character
        const charIdx = Math.floor(brightness * (chars.length - 1))
        const char = chars[charIdx]

        // Determine color
        if (colorMode === 'original') {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        } else if (colorMode === 'mono') {
          ctx.fillStyle = monoColor
        } else {
          // Gradient based on brightness
          ctx.fillStyle = this.interpolateColor(
            this.params.gradientStart,
            this.params.gradientEnd,
            brightness
          )
        }

        ctx.fillText(char, col * cellW, row * cellH)
      }
    }
  }

  // Render Matrix-style falling characters
  renderMatrix(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData | null,
    width: number,
    height: number,
    deltaTime: number
  ) {
    const { fontSize, matrixSpeed } = this.params

    // Semi-transparent black overlay for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'

    // Update and draw columns
    this.matrixColumns.forEach(col => {
      // Update position
      col.y += col.speed * matrixSpeed * deltaTime * 100

      // Reset if off screen
      if (col.y > height + fontSize * col.chars.length) {
        col.y = -fontSize * col.chars.length
        col.chars = this.generateMatrixChars()
        col.speed = 0.5 + Math.random() * 1.5
      }

      // Draw characters
      col.chars.forEach((char, i) => {
        const y = col.y + i * fontSize
        if (y < 0 || y > height) return

        // Brightness based on image if available
        let brightness = 1
        if (imageData) {
          const px = Math.floor(col.x / width * imageData.width)
          const py = Math.floor(y / height * imageData.height)
          const idx = (py * imageData.width + px) * 4
          brightness = ((imageData.data[idx] || 0) + (imageData.data[idx + 1] || 0) + (imageData.data[idx + 2] || 0)) / 765
        }

        // Fade based on position in trail
        const fade = 1 - i / col.chars.length
        const alpha = col.opacity * fade * brightness

        ctx.fillStyle = i === 0
          ? `rgba(255, 255, 255, ${alpha})` // Leading char is white
          : `rgba(0, 255, 0, ${alpha})`     // Trail is green

        ctx.fillText(char, col.x, y)
      })
    })
  }

  private interpolateColor(start: string, end: string, t: number): string {
    const s = this.hexToRgb(start)
    const e = this.hexToRgb(end)
    const r = Math.round(s.r + (e.r - s.r) * t)
    const g = Math.round(s.g + (e.g - s.g) * t)
    const b = Math.round(s.b + (e.b - s.b) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 }
  }
}
