# Blob Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ML-based detection with unified DETECT effect featuring blob tracking, trails, and generative visual styling.

**Architecture:** Canvas 2D overlay for blob detection and rendering, Zustand store for state, modular detectors for each mode.

**Tech Stack:** React 18, Zustand, Canvas 2D API, TypeScript

---

## Task 1: Create Blob Detect Store

**Files:**
- Create: `src/stores/blobDetectStore.ts`

**Step 1: Create the store with all parameters**

```typescript
import { create } from 'zustand'

export type DetectionMode = 'brightness' | 'motion' | 'color'
export type TrailMode = 'fade' | 'fixed' | 'persistent'
export type BlobStyle = 'box' | 'circle' | 'none'
export type ConnectStyle = 'solid' | 'dashed' | 'curved'
export type StylePreset = 'technical' | 'neon' | 'organic'

export interface Blob {
  id: number
  x: number
  y: number
  width: number
  height: number
  age: number
}

export interface TrailPoint {
  x: number
  y: number
  timestamp: number
  blobId: number
}

export interface BlobDetectParams {
  // Detection mode
  mode: DetectionMode

  // Brightness mode
  threshold: number
  invert: boolean

  // Motion mode
  sensitivity: number
  decayRate: number

  // Color mode
  targetHue: number
  hueRange: number
  saturationMin: number
  brightnessMin: number

  // Shared detection
  minSize: number
  maxSize: number
  maxBlobs: number
  smoothing: number
  blurAmount: number

  // Trails
  trailEnabled: boolean
  trailMode: TrailMode
  fadeTime: number
  trailLength: number
  recordInterval: number
  lineWidth: number
  lineColor: string
  lineSmoothness: number
  lineOpacity: number

  // Blob visuals
  blobStyle: BlobStyle
  blobFill: boolean
  blobColor: string
  blobOpacity: number
  blobLineWidth: number

  // Glow
  glowEnabled: boolean
  glowIntensity: number
  glowColor: string

  // Connections
  connectEnabled: boolean
  connectMaxDistance: number
  connectColor: string
  connectWidth: number
  connectStyle: ConnectStyle
}

export const DEFAULT_BLOB_DETECT_PARAMS: BlobDetectParams = {
  mode: 'brightness',

  threshold: 0.5,
  invert: false,

  sensitivity: 0.3,
  decayRate: 0.1,

  targetHue: 0,
  hueRange: 30,
  saturationMin: 0.3,
  brightnessMin: 0.3,

  minSize: 0.01,
  maxSize: 0.5,
  maxBlobs: 20,
  smoothing: 0.5,
  blurAmount: 5,

  trailEnabled: true,
  trailMode: 'fade',
  fadeTime: 2,
  trailLength: 100,
  recordInterval: 33,
  lineWidth: 2,
  lineColor: '#00ffff',
  lineSmoothness: 0.5,
  lineOpacity: 0.8,

  blobStyle: 'circle',
  blobFill: false,
  blobColor: '#00ffff',
  blobOpacity: 1,
  blobLineWidth: 2,

  glowEnabled: true,
  glowIntensity: 0.5,
  glowColor: '#00ffff',

  connectEnabled: false,
  connectMaxDistance: 0.2,
  connectColor: '#ff3366',
  connectWidth: 1,
  connectStyle: 'solid',
}

interface BlobDetectState {
  enabled: boolean
  params: BlobDetectParams

  // Runtime state
  blobs: Blob[]
  trails: TrailPoint[]

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<BlobDetectParams>) => void
  setMode: (mode: DetectionMode) => void
  applyPreset: (preset: StylePreset) => void
  setBlobs: (blobs: Blob[]) => void
  addTrailPoints: (points: TrailPoint[]) => void
  clearTrails: () => void
  reset: () => void
}

const PRESETS: Record<StylePreset, Partial<BlobDetectParams>> = {
  technical: {
    blobStyle: 'box',
    blobFill: false,
    blobColor: '#ffffff',
    blobLineWidth: 1,
    lineWidth: 1,
    lineColor: '#ffffff',
    lineSmoothness: 0,
    glowEnabled: false,
    connectStyle: 'solid',
  },
  neon: {
    blobStyle: 'circle',
    blobFill: false,
    blobColor: '#00ffff',
    blobLineWidth: 2,
    lineWidth: 2,
    lineColor: '#ff00ff',
    lineSmoothness: 0.3,
    glowEnabled: true,
    glowIntensity: 0.7,
    glowColor: '#00ffff',
    connectStyle: 'solid',
  },
  organic: {
    blobStyle: 'circle',
    blobFill: true,
    blobColor: '#88ff88',
    blobOpacity: 0.6,
    lineWidth: 3,
    lineColor: '#88ff88',
    lineSmoothness: 1,
    lineOpacity: 0.5,
    glowEnabled: true,
    glowIntensity: 0.3,
    connectStyle: 'curved',
  },
}

export const useBlobDetectStore = create<BlobDetectState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_BLOB_DETECT_PARAMS },
  blobs: [],
  trails: [],

  setEnabled: (enabled) => set({ enabled }),

  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),

  setMode: (mode) => set((state) => ({
    params: { ...state.params, mode },
  })),

  applyPreset: (preset) => set((state) => ({
    params: { ...state.params, ...PRESETS[preset] },
  })),

  setBlobs: (blobs) => set({ blobs }),

  addTrailPoints: (points) => set((state) => ({
    trails: [...state.trails, ...points],
  })),

  clearTrails: () => set({ trails: [] }),

  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_BLOB_DETECT_PARAMS },
    blobs: [],
    trails: [],
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/blobDetectStore.ts
git commit -m "feat: add blob detect store with all parameters"
```

---

## Task 2: Create Brightness Detector

**Files:**
- Create: `src/effects/blob-detect/BrightnessDetector.ts`

**Step 1: Create the detector class**

```typescript
import type { Blob, BlobDetectParams } from '../../stores/blobDetectStore'

export class BrightnessDetector {
  private canvas: OffscreenCanvas
  private ctx: OffscreenCanvasRenderingContext2D
  private nextBlobId = 0

  constructor(width = 320, height = 180) {
    this.canvas = new OffscreenCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
  }

  detect(source: HTMLVideoElement | HTMLImageElement, params: BlobDetectParams): Blob[] {
    const { threshold, invert, minSize, maxSize, maxBlobs, blurAmount } = params

    // Draw source to small canvas for performance
    this.ctx.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : 'none'
    this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height)

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const { data, width, height } = imageData

    // Create binary mask based on brightness threshold
    const mask = new Uint8Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 765 // 0-1
      const idx = i / 4
      const passesThreshold = invert ? brightness < threshold : brightness > threshold
      mask[idx] = passesThreshold ? 1 : 0
    }

    // Find connected components (simple flood fill)
    const blobs = this.findBlobs(mask, width, height, minSize, maxSize, maxBlobs)

    return blobs
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
    const stack = [[startX, startY]]
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
```

**Step 2: Commit**

```bash
git add src/effects/blob-detect/BrightnessDetector.ts
git commit -m "feat: add brightness-based blob detector"
```

---

## Task 3: Create Motion Detector

**Files:**
- Create: `src/effects/blob-detect/MotionDetector.ts`

**Step 1: Create the motion detector**

```typescript
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

  detect(source: HTMLVideoElement | HTMLImageElement, params: BlobDetectParams): Blob[] {
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
      prev[i] = prev[i] * (1 - decay) + curr[i] * decay
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
    const stack = [[startX, startY]]
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
```

**Step 2: Commit**

```bash
git add src/effects/blob-detect/MotionDetector.ts
git commit -m "feat: add motion-based blob detector"
```

---

## Task 4: Create Color Detector

**Files:**
- Create: `src/effects/blob-detect/ColorDetector.ts`

**Step 1: Create the color detector**

```typescript
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
    const stack = [[startX, startY]]
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
```

**Step 2: Commit**

```bash
git add src/effects/blob-detect/ColorDetector.ts
git commit -m "feat: add color-based blob detector"
```

---

## Task 5: Create Trail System

**Files:**
- Create: `src/effects/blob-detect/TrailSystem.ts`

**Step 1: Create the trail system**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/effects/blob-detect/TrailSystem.ts
git commit -m "feat: add trail system for blob tracking"
```

---

## Task 6: Create Blob Renderer

**Files:**
- Create: `src/effects/blob-detect/BlobRenderer.ts`

**Step 1: Create the renderer**

```typescript
import type { Blob, TrailPoint, BlobDetectParams } from '../../stores/blobDetectStore'

export class BlobRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    blobs: Blob[],
    trails: TrailPoint[],
    params: BlobDetectParams,
    width: number,
    height: number
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
      this.drawTrails(ctx, trails, params, width, height)
    }

    // Draw connecting lines
    if (params.connectEnabled && blobs.length > 1) {
      this.drawConnections(ctx, blobs, params, width, height)
    }

    // Draw blobs
    if (params.blobStyle !== 'none') {
      this.drawBlobs(ctx, blobs, params, width, height)
    }
  }

  private drawTrails(
    ctx: CanvasRenderingContext2D,
    trails: TrailPoint[],
    params: BlobDetectParams,
    width: number,
    height: number
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
    ctx.globalAlpha = params.lineOpacity

    for (const points of byBlob.values()) {
      if (points.length < 2) continue

      ctx.beginPath()

      if (params.lineSmoothness > 0) {
        // Bezier curve interpolation
        this.drawSmoothLine(ctx, points, params.lineSmoothness, width, height)
      } else {
        // Sharp corners
        ctx.moveTo(points[0].x * width, points[0].y * height)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * width, points[i].y * height)
        }
      }

      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  private drawSmoothLine(
    ctx: CanvasRenderingContext2D,
    points: TrailPoint[],
    smoothness: number,
    width: number,
    height: number
  ) {
    const pts = points.map(p => ({ x: p.x * width, y: p.y * height }))

    ctx.moveTo(pts[0].x, pts[0].y)

    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]

      const cp1x = p1.x - (p2.x - p0.x) * 0.25 * smoothness
      const cp1y = p1.y - (p2.y - p0.y) * 0.25 * smoothness
      const cp2x = p1.x + (p2.x - p0.x) * 0.25 * smoothness
      const cp2y = p1.y + (p2.y - p0.y) * 0.25 * smoothness

      ctx.quadraticCurveTo(cp1x, cp1y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
    }

    if (pts.length > 1) {
      const last = pts[pts.length - 1]
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
          ctx.beginPath()

          if (params.connectStyle === 'curved') {
            const midX = (a.x + b.x) / 2
            const midY = (a.y + b.y) / 2 - dist * 0.2
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
      const w = blob.width * width
      const h = blob.height * height

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
```

**Step 2: Commit**

```bash
git add src/effects/blob-detect/BlobRenderer.ts
git commit -m "feat: add blob renderer with trails, connections, and glow"
```

---

## Task 7: Create Blob Detect Overlay Component

**Files:**
- Create: `src/components/overlays/BlobDetectOverlay.tsx`

**Step 1: Create the overlay component**

```typescript
import { useRef, useEffect } from 'react'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { useMediaStore } from '../../stores/mediaStore'
import { BrightnessDetector } from '../../effects/blob-detect/BrightnessDetector'
import { MotionDetector } from '../../effects/blob-detect/MotionDetector'
import { ColorDetector } from '../../effects/blob-detect/ColorDetector'
import { TrailSystem } from '../../effects/blob-detect/TrailSystem'
import { BlobRenderer } from '../../effects/blob-detect/BlobRenderer'

interface Props {
  containerRef: React.RefObject<HTMLDivElement>
}

export function BlobDetectOverlay({ containerRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const brightnessDetector = useRef<BrightnessDetector>()
  const motionDetector = useRef<MotionDetector>()
  const colorDetector = useRef<ColorDetector>()
  const trailSystem = useRef<TrailSystem>()
  const renderer = useRef<BlobRenderer>()
  const frameId = useRef<number>()

  const { enabled, params, setBlobs, trails, addTrailPoints, clearTrails } = useBlobDetectStore()
  const { videoElement, imageElement } = useMediaStore()

  useEffect(() => {
    brightnessDetector.current = new BrightnessDetector()
    motionDetector.current = new MotionDetector()
    colorDetector.current = new ColorDetector()
    trailSystem.current = new TrailSystem()
    renderer.current = new BlobRenderer()

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
    }
  }, [])

  useEffect(() => {
    if (!enabled || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const source = videoElement || imageElement

    if (!source) return

    const animate = () => {
      if (!containerRef.current) return

      const { clientWidth: width, clientHeight: height } = containerRef.current
      canvas.width = width
      canvas.height = height

      // Select detector based on mode
      let detector: BrightnessDetector | MotionDetector | ColorDetector
      switch (params.mode) {
        case 'brightness':
          detector = brightnessDetector.current!
          break
        case 'motion':
          detector = motionDetector.current!
          break
        case 'color':
          detector = colorDetector.current!
          break
      }

      // Detect blobs
      const blobs = detector.detect(source as HTMLVideoElement | HTMLImageElement, params)
      setBlobs(blobs)

      // Process trails
      const timestamp = performance.now()
      const newTrails = trailSystem.current!.processFrame(blobs, trails, params, timestamp)

      // Only update if trails changed
      if (newTrails.length !== trails.length) {
        // Clear and re-add to avoid stale closures
        clearTrails()
        if (newTrails.length > 0) {
          addTrailPoints(newTrails)
        }
      }

      // Render
      renderer.current!.render(ctx, blobs, newTrails, params, width, height)

      frameId.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
    }
  }, [enabled, params, videoElement, imageElement])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/BlobDetectOverlay.tsx
git commit -m "feat: add BlobDetectOverlay component"
```

---

## Task 8: Update Effects Config

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Replace detection effects with new DETECT**

Remove the ML detection and point network entries, add the new DETECT effect.

**Step 2: Commit**

```bash
git add src/config/effects.ts
git commit -m "feat: update effects config with unified DETECT"
```

---

## Task 9: Create Effect Parameter Editor

**Files:**
- Create: `src/components/performance/EffectParameterEditor.tsx`

**Step 1: Create the component**

A panel that shows full parameters for the selected effect, with collapsible sections for Detection, Trails, Visuals, and Connections.

**Step 2: Commit**

```bash
git add src/components/performance/EffectParameterEditor.tsx
git commit -m "feat: add EffectParameterEditor component"
```

---

## Task 10: Update Graphic Panel

**Files:**
- Modify: `src/components/performance/GraphicPanelV2.tsx`

**Step 1: Add selected effect state and conditional rendering**

When an effect is selected in the grid, show EffectParameterEditor instead of visualization.

**Step 2: Commit**

```bash
git add src/components/performance/GraphicPanelV2.tsx
git commit -m "feat: graphic panel shows effect parameters when selected"
```

---

## Task 11: Update Overlay Container

**Files:**
- Modify: `src/components/overlays/OverlayContainer.tsx`

**Step 1: Add BlobDetectOverlay to container**

**Step 2: Commit**

```bash
git add src/components/overlays/OverlayContainer.tsx
git commit -m "feat: add BlobDetectOverlay to overlay container"
```

---

## Task 12: Update Routing Store Snapshots

**Files:**
- Modify: `src/stores/routingStore.ts`

**Step 1: Replace old detection snapshots with blob detect**

Remove references to detectionOverlayStore and pointNetworkStore, add blobDetectStore snapshot.

**Step 2: Commit**

```bash
git add src/stores/routingStore.ts
git commit -m "feat: update routing store for blob detect snapshots"
```

---

## Task 13: Remove Old Detection Code

**Files:**
- Delete: `src/stores/detectionOverlayStore.ts`
- Delete: `src/stores/pointNetworkStore.ts`
- Delete: Related overlay components

**Step 1: Remove old files and imports**

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old ML detection and point network code"
```

---

## Task 14: Test and Polish

**Steps:**
1. Run the app, test all three detection modes
2. Test trail modes (fade, fixed, persistent)
3. Test visual presets
4. Test clear trails button
5. Verify parameter editor shows/hides correctly

**Commit:**

```bash
git commit -m "test: verify blob tracking functionality"
```

---

## Summary

**New files:**
- `src/stores/blobDetectStore.ts`
- `src/effects/blob-detect/BrightnessDetector.ts`
- `src/effects/blob-detect/MotionDetector.ts`
- `src/effects/blob-detect/ColorDetector.ts`
- `src/effects/blob-detect/TrailSystem.ts`
- `src/effects/blob-detect/BlobRenderer.ts`
- `src/components/overlays/BlobDetectOverlay.tsx`
- `src/components/performance/EffectParameterEditor.tsx`

**Modified files:**
- `src/config/effects.ts`
- `src/components/performance/GraphicPanelV2.tsx`
- `src/components/overlays/OverlayContainer.tsx`
- `src/stores/routingStore.ts`

**Deleted files:**
- `src/stores/detectionOverlayStore.ts`
- `src/stores/pointNetworkStore.ts`
- Related old detection components
