import type { Blob, TrailPoint, BlobDetectParams } from '../../stores/blobDetectStore'

export class BlobRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    blobs: Blob[],
    trails: TrailPoint[],
    params: BlobDetectParams,
    width: number,
    height: number,
    timestamp: number
  ) {
    ctx.clearRect(0, 0, width, height)

    // Apply glow if enabled
    if (params.glowEnabled) {
      ctx.shadowBlur = params.glowIntensity * 30
      ctx.shadowColor = params.glowColor
    } else {
      ctx.shadowBlur = 0
    }

    // Draw trails
    if (params.trailEnabled && trails.length > 0) {
      this.drawTrails(ctx, trails, params, width, height, timestamp)
    }

    // Draw connecting lines
    if (params.connectEnabled && blobs.length > 1) {
      this.drawConnections(ctx, blobs, params, width, height)
    }

    // Draw blobs
    if (params.blobStyle !== 'none') {
      this.drawBlobs(ctx, blobs, params, width, height)
    }

    // Reset shadow
    ctx.shadowBlur = 0
  }

  private drawTrails(
    ctx: CanvasRenderingContext2D,
    trails: TrailPoint[],
    params: BlobDetectParams,
    width: number,
    height: number,
    timestamp: number
  ) {
    // Group trails by blob
    const byBlob = new Map<number, TrailPoint[]>()
    for (const point of trails) {
      if (!byBlob.has(point.blobId)) byBlob.set(point.blobId, [])
      byBlob.get(point.blobId)!.push(point)
    }

    ctx.strokeStyle = params.lineColor
    ctx.lineWidth = params.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const points of byBlob.values()) {
      if (points.length < 2) continue

      // Sort by timestamp to ensure correct order
      points.sort((a, b) => a.timestamp - b.timestamp)

      ctx.beginPath()

      if (params.lineSmoothness > 0 && points.length > 2) {
        // Bezier curve interpolation
        this.drawSmoothLine(ctx, points, params, width, height, timestamp)
      } else {
        // Sharp corners
        ctx.moveTo(points[0].x * width, points[0].y * height)
        for (let i = 1; i < points.length; i++) {
          const opacity = this.getPointOpacity(points[i], params, timestamp)
          ctx.globalAlpha = params.lineOpacity * opacity
          ctx.lineTo(points[i].x * width, points[i].y * height)
        }
      }

      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  private getPointOpacity(point: TrailPoint, params: BlobDetectParams, timestamp: number): number {
    if (params.trailMode === 'fade') {
      const age = timestamp - point.timestamp
      const maxAge = params.fadeTime * 1000
      return Math.max(0, 1 - age / maxAge)
    }
    return 1
  }

  private drawSmoothLine(
    ctx: CanvasRenderingContext2D,
    points: TrailPoint[],
    params: BlobDetectParams,
    width: number,
    height: number,
    timestamp: number
  ) {
    const pts = points.map(p => ({
      x: p.x * width,
      y: p.y * height,
      opacity: this.getPointOpacity(p, params, timestamp)
    }))

    ctx.globalAlpha = params.lineOpacity * pts[0].opacity
    ctx.moveTo(pts[0].x, pts[0].y)

    for (let i = 1; i < pts.length - 1; i++) {
      const p1 = pts[i]
      const p2 = pts[i + 1]

      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2

      ctx.globalAlpha = params.lineOpacity * p1.opacity
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
    }

    if (pts.length > 1) {
      const last = pts[pts.length - 1]
      ctx.globalAlpha = params.lineOpacity * last.opacity
      ctx.lineTo(last.x, last.y)
    }
  }

  private drawConnections(
    ctx: CanvasRenderingContext2D,
    blobs: Blob[],
    params: BlobDetectParams,
    width: number,
    height: number
  ) {
    ctx.strokeStyle = params.connectColor
    ctx.lineWidth = params.connectWidth
    ctx.globalAlpha = 1

    if (params.connectStyle === 'dashed') {
      ctx.setLineDash([5, 5])
    } else {
      ctx.setLineDash([])
    }

    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        const a = blobs[i]
        const b = blobs[j]
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

        if (dist <= params.connectMaxDistance) {
          // Fade based on distance
          const opacity = 1 - (dist / params.connectMaxDistance)
          ctx.globalAlpha = opacity

          ctx.beginPath()

          if (params.connectStyle === 'curved') {
            const midX = (a.x + b.x) / 2
            const midY = (a.y + b.y) / 2 - dist * 0.3
            ctx.moveTo(a.x * width, a.y * height)
            ctx.quadraticCurveTo(midX * width, midY * height, b.x * width, b.y * height)
          } else {
            ctx.moveTo(a.x * width, a.y * height)
            ctx.lineTo(b.x * width, b.y * height)
          }

          ctx.stroke()
        }
      }
    }

    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  private drawBlobs(
    ctx: CanvasRenderingContext2D,
    blobs: Blob[],
    params: BlobDetectParams,
    width: number,
    height: number
  ) {
    ctx.strokeStyle = params.blobColor
    ctx.fillStyle = params.blobColor
    ctx.lineWidth = params.blobLineWidth
    ctx.globalAlpha = params.blobOpacity

    for (const blob of blobs) {
      const x = blob.x * width
      const y = blob.y * height
      const w = Math.max(blob.width * width, 20)
      const h = Math.max(blob.height * height, 20)

      ctx.beginPath()

      if (params.blobStyle === 'circle') {
        const radius = Math.max(w, h) / 2
        ctx.arc(x, y, radius, 0, Math.PI * 2)
      } else {
        ctx.rect(x - w / 2, y - h / 2, w, h)
      }

      if (params.blobFill) {
        ctx.fill()
      } else {
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
  }
}
