/**
 * halftoneEffect.ts
 * Classic print halftone with angled dot screens
 * Simulates CMYK newspaper/magazine printing
 */

export interface HalftoneParams {
  dotSize: number
  angle: number
  colorMode: 'mono' | 'cmyk' | 'rgb'
  contrast: number
}

// CMYK angles for traditional halftone screens
const CMYK_ANGLES = {
  c: 15,   // Cyan
  m: 75,   // Magenta
  y: 0,    // Yellow
  k: 45,   // Black
}

const RGB_ANGLES = {
  r: 15,
  g: 75,
  b: 45,
}

export function renderHalftone(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: HalftoneParams
): void {
  const { dotSize, angle, colorMode, contrast } = params

  // Get source image data
  const imageData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // For CMYK/RGB mode, we render multiple passes
  if (colorMode === 'cmyk') {
    renderCMYKHalftone(destCtx, pixels, width, height, dotSize, contrast)
  } else if (colorMode === 'rgb') {
    renderRGBHalftone(destCtx, pixels, width, height, dotSize, contrast)
  } else {
    // Mono mode - single angle halftone
    renderMonoHalftone(destCtx, pixels, width, height, dotSize, angle, contrast)
  }
}

function renderMonoHalftone(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  angle: number,
  contrast: number
): void {
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const maxRadius = dotSize * 0.5

  ctx.fillStyle = '#fff'

  // Sample at rotated grid intervals
  const step = dotSize
  const diagonal = Math.sqrt(width * width + height * height)

  for (let gy = -diagonal; gy < diagonal; gy += step) {
    for (let gx = -diagonal; gx < diagonal; gx += step) {
      // Rotate grid position to screen position
      const x = gx * cos - gy * sin + width / 2
      const y = gx * sin + gy * cos + height / 2

      if (x < 0 || x >= width || y < 0 || y >= height) continue

      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255

      // Apply contrast
      const adjusted = Math.pow(brightness, 1 / contrast)
      const radius = adjusted * maxRadius

      if (radius > 0.5) {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function renderCMYKHalftone(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  contrast: number
): void {
  const channels = [
    { color: 'rgba(0, 255, 255, 0.7)', angle: CMYK_ANGLES.c, channel: 'c' },
    { color: 'rgba(255, 0, 255, 0.7)', angle: CMYK_ANGLES.m, channel: 'm' },
    { color: 'rgba(255, 255, 0, 0.7)', angle: CMYK_ANGLES.y, channel: 'y' },
    { color: 'rgba(0, 0, 0, 0.9)', angle: CMYK_ANGLES.k, channel: 'k' },
  ]

  ctx.globalCompositeOperation = 'multiply'

  for (const { color, angle, channel } of channels) {
    renderChannelHalftone(ctx, pixels, width, height, dotSize, angle, contrast, color, channel)
  }

  ctx.globalCompositeOperation = 'source-over'
}

function renderRGBHalftone(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  contrast: number
): void {
  const channels = [
    { color: 'rgba(255, 0, 0, 0.8)', angle: RGB_ANGLES.r, channel: 'r' },
    { color: 'rgba(0, 255, 0, 0.8)', angle: RGB_ANGLES.g, channel: 'g' },
    { color: 'rgba(0, 0, 255, 0.8)', angle: RGB_ANGLES.b, channel: 'b' },
  ]

  ctx.globalCompositeOperation = 'screen'

  for (const { color, angle, channel } of channels) {
    renderChannelHalftone(ctx, pixels, width, height, dotSize, angle, contrast, color, channel)
  }

  ctx.globalCompositeOperation = 'source-over'
}

function renderChannelHalftone(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  angle: number,
  contrast: number,
  color: string,
  channel: string
): void {
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const maxRadius = dotSize * 0.5
  const step = dotSize
  const diagonal = Math.sqrt(width * width + height * height)

  ctx.fillStyle = color

  for (let gy = -diagonal; gy < diagonal; gy += step) {
    for (let gx = -diagonal; gx < diagonal; gx += step) {
      const x = gx * cos - gy * sin + width / 2
      const y = gx * sin + gy * cos + height / 2

      if (x < 0 || x >= width || y < 0 || y >= height) continue

      const px = Math.floor(x)
      const py = Math.floor(y)
      const idx = (py * width + px) * 4

      let value: number
      if (channel === 'c') {
        value = 1 - pixels[idx] / 255  // Cyan = inverse red
      } else if (channel === 'm') {
        value = 1 - pixels[idx + 1] / 255  // Magenta = inverse green
      } else if (channel === 'y') {
        value = 1 - pixels[idx + 2] / 255  // Yellow = inverse blue
      } else if (channel === 'k') {
        const r = pixels[idx] / 255
        const g = pixels[idx + 1] / 255
        const b = pixels[idx + 2] / 255
        value = 1 - Math.max(r, g, b)  // Black = inverse of max
      } else if (channel === 'r') {
        value = pixels[idx] / 255
      } else if (channel === 'g') {
        value = pixels[idx + 1] / 255
      } else {
        value = pixels[idx + 2] / 255
      }

      const adjusted = Math.pow(value, 1 / contrast)
      const radius = adjusted * maxRadius

      if (radius > 0.5) {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
