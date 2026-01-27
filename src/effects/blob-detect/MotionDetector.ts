import type { Blob, BlobDetectParams } from '../../stores/blobDetectStore'

export class MotionDetector {
  private canvas: OffscreenCanvas
  private ctx: OffscreenCanvasRenderingContext2D
  private prevFrame: ImageData | null = null
  private nextBlobId = 0

  constructor(width = 320, height = 180) {
    this.canvas = new OffscreenCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
  }

  detect(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, params: BlobDetectParams): Blob[] {
    const { sensitivity, minSize, maxSize, maxBlobs, blurAmount } = params

    this.ctx.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : 'none'
    this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height)

    const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

    if (!this.prevFrame) {
      this.prevFrame = currentFrame
      return []
    }

    const { data: curr, width, height } = currentFrame
    const prev = this.prevFrame.data

    // Create motion mask by comparing frames
    const mask = new Uint8Array(width * height)
    const threshold = (1 - sensitivity) * 100

    for (let i = 0; i < curr.length; i += 4) {
      const diff = Math.abs(curr[i] - prev[i]) +
                   Math.abs(curr[i + 1] - prev[i + 1]) +
                   Math.abs(curr[i + 2] - prev[i + 2])
      mask[i / 4] = diff > threshold ? 1 : 0
    }

    // Update reference frame with decay
    const decay = params.decayRate
    for (let i = 0; i < prev.length; i++) {
      prev[i] = Math.round(prev[i] * (1 - decay) + curr[i] * decay)
    }

    return this.findBlobs(mask, width, height, minSize, maxSize, maxBlobs)
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

  reset() {
    this.prevFrame = null
  }

  resize(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
    this.prevFrame = null
  }
}
