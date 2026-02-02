import { useRef, useEffect } from 'react'
import { useContourStore } from '../../stores/contourStore'
import { useMediaStore } from '../../stores/mediaStore'

interface Props {
  width: number
  height: number
  glCanvas?: HTMLCanvasElement | null
}

interface Blob {
  id: number
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
  area: number
  value: number // tracking value for display
  compactness: number  // Shape metric for rendering style
}

// Downsampled resolution for blob detection
const DOWNSAMPLE_WIDTH = 160
const DOWNSAMPLE_HEIGHT = 90

// Target frame rate
const TARGET_FPS = 20
const FRAME_INTERVAL = 1000 / TARGET_FPS

export function ContourOverlay({ width, height, glCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const frameIdRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const blobIdCounter = useRef<number>(0)
  const trackedBlobs = useRef<Map<number, Blob>>(new Map())

  // Use refs to avoid recreating animation callback
  const paramsRef = useRef(useContourStore.getState().params)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const imageElementRef = useRef<HTMLImageElement | null>(null)
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs with props/state
  const { enabled, params } = useContourStore()
  const { videoElement, imageElement } = useMediaStore()

  paramsRef.current = params
  videoElementRef.current = videoElement
  imageElementRef.current = imageElement
  glCanvasRef.current = glCanvas ?? null
  sizeRef.current = { width, height }

  // Initialize on mount
  useEffect(() => {
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = DOWNSAMPLE_WIDTH
    offscreenRef.current.height = DOWNSAMPLE_HEIGHT
    offscreenCtxRef.current = offscreenRef.current.getContext('2d', {
      willReadFrequently: true,
    })

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
      offscreenRef.current = null
      offscreenCtxRef.current = null
    }
  }, [])

  // Clear when disabled
  useEffect(() => {
    if (!enabled) {
      trackedBlobs.current.clear()
      blobIdCounter.current = 0
      prevFrameRef.current = null
    }
  }, [enabled])

  // Reset previous frame when detection mode changes
  useEffect(() => {
    prevFrameRef.current = null
    trackedBlobs.current.clear()
  }, [params.mode])

  // Connected component labeling from binary array with shape analysis
  function detectFromBinaryArray(
    binary: Uint8Array,
    w: number,
    h: number,
    minSize: number
  ): Blob[] {
    const labels = new Int32Array(w * h)
    const parent: number[] = []
    let nextLabel = 1

    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x])
      return parent[x]
    }
    const union = (a: number, b: number) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parent[rb] = ra
    }

    // First pass - label connected components
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        if (binary[idx] === 1) {
          const left = x > 0 ? labels[idx - 1] : 0
          const up = y > 0 ? labels[idx - w] : 0

          if (left === 0 && up === 0) {
            labels[idx] = nextLabel
            parent[nextLabel] = nextLabel
            nextLabel++
          } else if (left !== 0 && up === 0) {
            labels[idx] = left
          } else if (left === 0 && up !== 0) {
            labels[idx] = up
          } else {
            labels[idx] = left
            if (left !== up) union(left, up)
          }
        }
      }
    }

    // Collect stats including perimeter
    const stats = new Map<number, {
      minX: number; maxX: number; minY: number; maxY: number;
      count: number; perimeter: number
    }>()

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        const label = labels[idx]
        if (label > 0) {
          const root = find(label)

          // Check if this pixel is on the perimeter
          const isPerimeter =
            x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
            binary[idx - 1] === 0 || binary[idx + 1] === 0 ||
            binary[idx - w] === 0 || binary[idx + w] === 0

          if (!stats.has(root)) {
            stats.set(root, {
              minX: x, maxX: x, minY: y, maxY: y,
              count: 1, perimeter: isPerimeter ? 1 : 0
            })
          } else {
            const s = stats.get(root)!
            s.minX = Math.min(s.minX, x)
            s.maxX = Math.max(s.maxX, x)
            s.minY = Math.min(s.minY, y)
            s.maxY = Math.max(s.maxY, y)
            s.count++
            if (isPerimeter) s.perimeter++
          }
        }
      }
    }

    const blobs: Blob[] = []
    stats.forEach((s, label) => {
      if (s.count >= minSize) {
        const blobWidth = (s.maxX - s.minX + 1)
        const blobHeight = (s.maxY - s.minY + 1)

        // Compactness: 4π*area/perimeter² (1.0 = perfect circle)
        const perimeter = Math.max(s.perimeter, 1)
        const compactness = Math.min((4 * Math.PI * s.count) / (perimeter * perimeter), 1)

        blobs.push({
          id: label,
          x: s.minX / w,
          y: s.minY / h,
          width: blobWidth / w,
          height: blobHeight / h,
          centerX: (s.minX + s.maxX) / 2 / w,
          centerY: (s.minY + s.maxY) / 2 / h,
          area: s.count,
          value: 0,
          compactness,
        })
      }
    })

    return blobs
  }

  // Detect blobs by brightness threshold
  function detectBrightness(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const binary = new Uint8Array(w * h)

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      binary[i] = lum >= threshold ? 1 : 0
    }

    return detectFromBinaryArray(binary, w, h, minSize)
  }

  // Detect blobs by edge detection (Sobel)
  function detectEdges(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const edges = new Uint8Array(w * h)

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const getLum = (ox: number, oy: number) => {
          const i = ((y + oy) * w + (x + ox)) * 4
          return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        }

        const gx = -getLum(-1, -1) - 2 * getLum(-1, 0) - getLum(-1, 1) +
                    getLum(1, -1) + 2 * getLum(1, 0) + getLum(1, 1)
        const gy = -getLum(-1, -1) - 2 * getLum(0, -1) - getLum(1, -1) +
                    getLum(-1, 1) + 2 * getLum(0, 1) + getLum(1, 1)
        const magnitude = Math.sqrt(gx * gx + gy * gy)

        edges[y * w + x] = magnitude >= threshold ? 1 : 0
      }
    }

    return detectFromBinaryArray(edges, w, h, minSize)
  }

  // Detect blobs by color matching
  function detectColor(
    imageData: ImageData,
    targetColor: string,
    colorRange: number,
    minSize: number
  ): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const binary = new Uint8Array(w * h)

    // Parse target color
    const match = targetColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (!match) return []
    const tr = parseInt(match[1], 16)
    const tg = parseInt(match[2], 16)
    const tb = parseInt(match[3], 16)
    const maxDist = colorRange * 441.67 // sqrt(255^2 * 3)

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4
      const dist = Math.sqrt(
        (data[idx] - tr) ** 2 +
        (data[idx + 1] - tg) ** 2 +
        (data[idx + 2] - tb) ** 2
      )
      binary[i] = dist <= maxDist ? 1 : 0
    }

    return detectFromBinaryArray(binary, w, h, minSize)
  }

  // Detect blobs by motion (frame difference)
  function detectMotion(
    currentData: ImageData,
    prevData: ImageData | null,
    sensitivity: number,
    minSize: number
  ): Blob[] {
    if (!prevData) return []

    const w = currentData.width
    const h = currentData.height
    const curr = currentData.data
    const prev = prevData.data
    const motion = new Uint8Array(w * h)

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4
      const diff = Math.abs(curr[idx] - prev[idx]) +
                   Math.abs(curr[idx + 1] - prev[idx + 1]) +
                   Math.abs(curr[idx + 2] - prev[idx + 2])
      motion[i] = diff > sensitivity ? 1 : 0
    }

    return detectFromBinaryArray(motion, w, h, minSize)
  }

  // Match and track blobs across frames
  function trackBlobs(newBlobs: Blob[]): Blob[] {
    const tracked = trackedBlobs.current
    const matched = new Set<number>()
    const result: Blob[] = []

    // Match new blobs to existing tracked blobs by proximity
    for (const blob of newBlobs) {
      let bestMatch: number | null = null
      let bestDist = 0.15 // max distance threshold for matching

      tracked.forEach((existingBlob, id) => {
        if (matched.has(id)) return
        const dx = blob.centerX - existingBlob.centerX
        const dy = blob.centerY - existingBlob.centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestDist) {
          bestDist = dist
          bestMatch = id
        }
      })

      if (bestMatch !== null) {
        // Update existing blob with smoothing
        matched.add(bestMatch)
        const existingBlob = tracked.get(bestMatch)!
        blob.id = bestMatch
        blob.value = existingBlob.value + (1 / 7) // increment tracking value
        tracked.set(bestMatch, blob)
        result.push(blob)
      } else {
        // New blob
        const newId = blobIdCounter.current++
        blob.id = newId
        blob.value = newId * (1 / 7) // assign initial value based on ID
        tracked.set(newId, blob)
        result.push(blob)
      }
    }

    // Remove unmatched old blobs
    const toRemove: number[] = []
    tracked.forEach((_, id) => {
      if (!matched.has(id) && !newBlobs.some(b => b.id === id)) {
        toRemove.push(id)
      }
    })
    toRemove.forEach(id => tracked.delete(id))

    return result
  }

  // Single animation loop
  useEffect(() => {
    if (!enabled) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true

    const animate = (timestamp: number) => {
      if (!isRunningRef.current) return

      // Frame rate limiting
      const elapsed = timestamp - lastFrameTimeRef.current
      if (elapsed < FRAME_INTERVAL) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTimeRef.current = timestamp

      const canvas = canvasRef.current
      if (!canvas) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const offscreenCtx = offscreenCtxRef.current
      const offscreen = offscreenRef.current
      if (!offscreenCtx || !offscreen) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const currentParams = paramsRef.current
      const currentWidth = sizeRef.current.width
      const currentHeight = sizeRef.current.height

      const source = glCanvasRef.current || videoElementRef.current || imageElementRef.current
      if (!source) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const sourceWidth = glCanvasRef.current?.width ||
        videoElementRef.current?.videoWidth ||
        imageElementRef.current?.naturalWidth || 0
      const sourceHeight = glCanvasRef.current?.height ||
        videoElementRef.current?.videoHeight ||
        imageElementRef.current?.naturalHeight || 0

      if (sourceWidth === 0 || sourceHeight === 0) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      // Clear canvas
      ctx.clearRect(0, 0, currentWidth, currentHeight)

      try {
        // Downsample source
        offscreenCtx.drawImage(source, 0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)
        const imageData = offscreenCtx.getImageData(0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)

        // Detect blobs based on detection mode
        const minPixels = currentParams.minSize * 10 // scale minSize to pixel count
        let blobs: Blob[] = []

        switch (currentParams.mode) {
          case 'brightness':
            blobs = detectBrightness(imageData, currentParams.threshold * 255, minPixels)
            break
          case 'edge':
            blobs = detectEdges(imageData, currentParams.threshold * 150, minPixels)
            break
          case 'color':
            blobs = detectColor(imageData, currentParams.targetColor, currentParams.colorRange, minPixels)
            break
          case 'motion':
            // Motion sensitivity: lower threshold = more sensitive
            const sensitivity = 30 + (1 - currentParams.threshold) * 70
            blobs = detectMotion(imageData, prevFrameRef.current, sensitivity, minPixels)
            break
        }

        // Store current frame for motion detection
        prevFrameRef.current = imageData

        // Limit blob count
        if (blobs.length > 30) {
          blobs = blobs.sort((a, b) => b.area - a.area).slice(0, 30)
        }

        // Track blobs
        const trackedBlobList = trackBlobs(blobs)

        // Get style params
        const lineWidth = currentParams.baseWidth
        const contourColor = currentParams.color
        const glowColor = currentParams.glowColor
        const glowIntensity = currentParams.glowIntensity
        const taperAmount = currentParams.taperAmount

        // Draw connecting lines (Kojima-style strands)
        if (trackedBlobList.length > 1) {
          for (let i = 0; i < trackedBlobList.length; i++) {
            for (let j = i + 1; j < trackedBlobList.length; j++) {
              const a = trackedBlobList[i]
              const b = trackedBlobList[j]
              const dx = a.centerX - b.centerX
              const dy = a.centerY - b.centerY
              const dist = Math.sqrt(dx * dx + dy * dy)

              // Connect blobs within a certain distance
              if (dist < 0.4) {
                const ax = a.centerX * currentWidth
                const ay = a.centerY * currentHeight
                const bx = b.centerX * currentWidth
                const by = b.centerY * currentHeight
                const midX = (ax + bx) / 2
                const midY = (ay + by) / 2
                const perpX = -(by - ay) * 0.15
                const perpY = (bx - ax) * 0.15

                // Draw glow if enabled
                if (glowIntensity > 0) {
                  ctx.strokeStyle = glowColor
                  ctx.lineWidth = lineWidth * 3
                  ctx.globalAlpha = glowIntensity * 0.3
                  ctx.beginPath()
                  ctx.moveTo(ax, ay)
                  ctx.quadraticCurveTo(midX + perpX, midY + perpY, bx, by)
                  ctx.stroke()
                  ctx.globalAlpha = 1
                }

                // Draw main curved strand
                ctx.strokeStyle = contourColor
                ctx.lineWidth = lineWidth
                ctx.beginPath()
                ctx.moveTo(ax, ay)
                ctx.quadraticCurveTo(midX + perpX, midY + perpY, bx, by)
                ctx.stroke()

                // Draw secondary strand (opposite curve) with taper
                if (taperAmount > 0.3) {
                  ctx.globalAlpha = 0.4
                  ctx.lineWidth = lineWidth * 0.5
                  ctx.beginPath()
                  ctx.moveTo(ax, ay)
                  ctx.quadraticCurveTo(midX - perpX * 0.7, midY - perpY * 0.7, bx, by)
                  ctx.stroke()
                  ctx.globalAlpha = 1
                }
              }
            }
          }
        }

        // Draw contour outlines around blobs
        ctx.strokeStyle = contourColor
        ctx.lineWidth = lineWidth

        for (const blob of trackedBlobList) {
          const x = blob.x * currentWidth
          const y = blob.y * currentHeight
          const w = blob.width * currentWidth
          const h = blob.height * currentHeight
          const cx = x + w / 2
          const cy = y + h / 2

          // Draw glow if enabled
          if (glowIntensity > 0) {
            ctx.strokeStyle = glowColor
            ctx.lineWidth = lineWidth * 2.5
            ctx.globalAlpha = glowIntensity * 0.4
            if (blob.compactness > 0.5) {
              ctx.beginPath()
              ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
              ctx.stroke()
            } else {
              ctx.strokeRect(x, y, w, h)
            }
            ctx.globalAlpha = 1
          }

          // Draw main contour - use ellipse for compact shapes, rect for others
          ctx.strokeStyle = contourColor
          ctx.lineWidth = lineWidth
          if (blob.compactness > 0.5) {
            ctx.beginPath()
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
            ctx.stroke()
          } else {
            ctx.strokeRect(x, y, w, h)
          }
        }

      } catch (err) {
        console.error('Contour detection error:', err)
      }

      frameIdRef.current = requestAnimationFrame(animate)
    }

    frameIdRef.current = requestAnimationFrame(animate)

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}
