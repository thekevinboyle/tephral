import type { Blob, BlobDetectParams } from '../../stores/blobDetectStore'

export class ColorDetector {
  private canvas: OffscreenCanvas
  private ctx: OffscreenCanvasRenderingContext2D
  private nextBlobId = 0

  constructor(width = 320, height = 180) {
    this.canvas = new OffscreenCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
  }

  detect(source: HTMLVideoElement | HTMLImageElement, params: BlobDetectParams): Blob[] {
    const { targetHue, hueRange, saturationMin, brightnessMin, minSize, maxSize, maxBlobs, blurAmount } = params

    this.ctx.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : 'none'
    this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height)

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const { data, width, height } = imageData

    const mask = new Uint8Array(width * height)

    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2])

      // Check if pixel matches target color
      const hueDiff = Math.min(Math.abs(h - targetHue), 360 - Math.abs(h - targetHue))
      const matchesHue = hueDiff <= hueRange
      const matchesSat = s >= saturationMin
      const matchesBright = l >= brightnessMin

      mask[i / 4] = matchesHue && matchesSat && matchesBright ? 1 : 0
    }

    return this.findBlobs(mask, width, height, minSize, maxSize, maxBlobs)
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2

    if (max === min) {
      return [0, 0, l]
    }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h = 0
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }

    return [h * 360, s, l]
  }

  private findBlobs(
    mask: Uint8Array,
    width: number,
    height: number,
    minSize: number,
    maxSize: number,
    maxBlobs: number
  ): Blob[] {
    const visited = new Uint8Array(width * height)
    const blobs: Blob[] = []

    const minPixels = minSize * width * height
    const maxPixels = maxSize * width * height

    for (let y = 0; y < height && blobs.length < maxBlobs; y++) {
      for (let x = 0; x < width && blobs.length < maxBlobs; x++) {
        const idx = y * width + x
        if (mask[idx] && !visited[idx]) {
          const bounds = this.floodFill(mask, visited, width, height, x, y)
          const area = bounds.pixelCount

          if (area >= minPixels && area <= maxPixels) {
            blobs.push({
              id: this.nextBlobId++,
              x: (bounds.minX + bounds.maxX) / 2 / width,
              y: (bounds.minY + bounds.maxY) / 2 / height,
              width: (bounds.maxX - bounds.minX) / width,
              height: (bounds.maxY - bounds.minY) / height,
              age: 0,
            })
          }
        }
      }
    }

    return blobs
  }

  private floodFill(
    mask: Uint8Array,
    visited: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number
  ) {
    const stack: [number, number][] = [[startX, startY]]
    let minX = startX, maxX = startX, minY = startY, maxY = startY
    let pixelCount = 0

    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      const idx = y * width + x

      if (x < 0 || x >= width || y < 0 || y >= height) continue
      if (visited[idx] || !mask[idx]) continue

      visited[idx] = 1
      pixelCount++

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }

    return { minX, maxX, minY, maxY, pixelCount }
  }

  resize(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
  }
}
