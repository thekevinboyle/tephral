import type { Blob, TrailPoint, BlobDetectParams } from '../../stores/blobDetectStore'

export class TrailSystem {
  private lastRecordTime = 0

  processFrame(
    blobs: Blob[],
    currentTrails: TrailPoint[],
    params: BlobDetectParams,
    timestamp: number
  ): TrailPoint[] {
    if (!params.trailEnabled) {
      return []
    }

    let trails = [...currentTrails]

    // Add new trail points if enough time has passed
    if (timestamp - this.lastRecordTime >= params.recordInterval) {
      const newPoints: TrailPoint[] = blobs.map(blob => ({
        x: blob.x,
        y: blob.y,
        timestamp,
        blobId: blob.id,
      }))
      trails = [...trails, ...newPoints]
      this.lastRecordTime = timestamp
    }

    // Apply decay based on trail mode
    switch (params.trailMode) {
      case 'fade':
        trails = trails.filter(p => timestamp - p.timestamp < params.fadeTime * 1000)
        break
      case 'fixed':
        // Keep only last N points per blob
        const byBlob = new Map<number, TrailPoint[]>()
        for (const point of trails) {
          if (!byBlob.has(point.blobId)) byBlob.set(point.blobId, [])
          byBlob.get(point.blobId)!.push(point)
        }
        trails = []
        for (const points of byBlob.values()) {
          trails.push(...points.slice(-params.trailLength))
        }
        break
      case 'persistent':
        // Keep everything
        break
    }

    return trails
  }

  clear(): void {
    this.lastRecordTime = 0
  }
}
