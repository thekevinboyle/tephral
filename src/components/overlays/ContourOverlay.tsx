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
    }
  }, [enabled])

  // Detect blobs using connected component labeling
  function detectBlobs(
    imageData: ImageData,
    threshold: number,
    minSize: number
  ): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const labels = new Int32Array(w * h)
    const parent: number[] = []
    let nextLabel = 1

    // Helper to get luminance
    const getLuminance = (i: number) => {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      return 0.299 * r + 0.587 * g + 0.114 * b
    }

    // Union-find helpers
    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x])
      return parent[x]
    }
    const union = (a: number, b: number) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parent[rb] = ra
    }

    // First pass: label connected components
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        const lum = getLuminance(idx)

        if (lum >= threshold) {
          const left = x > 0 ? labels[idx - 1] : 0
          const up = y > 0 ? labels[idx - w] : 0

          if (left === 0 && up === 0) {
            // New label
            labels[idx] = nextLabel
            parent[nextLabel] = nextLabel
            nextLabel++
          } else if (left !== 0 && up === 0) {
            labels[idx] = left
          } else if (left === 0 && up !== 0) {
            labels[idx] = up
          } else {
            // Both neighbors labeled - union them
            labels[idx] = left
            if (left !== up) union(left, up)
          }
        }
      }
    }

    // Second pass: collect blob stats
    const blobStats = new Map<number, { minX: number; maxX: number; minY: number; maxY: number; count: number }>()

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        const label = labels[idx]
        if (label > 0) {
          const root = find(label)
          if (!blobStats.has(root)) {
            blobStats.set(root, { minX: x, maxX: x, minY: y, maxY: y, count: 1 })
          } else {
            const stats = blobStats.get(root)!
            stats.minX = Math.min(stats.minX, x)
            stats.maxX = Math.max(stats.maxX, x)
            stats.minY = Math.min(stats.minY, y)
            stats.maxY = Math.max(stats.maxY, y)
            stats.count++
          }
        }
      }
    }

    // Convert to blob objects
    const blobs: Blob[] = []
    blobStats.forEach((stats, label) => {
      if (stats.count >= minSize) {
        const blobW = (stats.maxX - stats.minX + 1) / w
        const blobH = (stats.maxY - stats.minY + 1) / h
        blobs.push({
          id: label,
          x: stats.minX / w,
          y: stats.minY / h,
          width: blobW,
          height: blobH,
          centerX: (stats.minX + stats.maxX) / 2 / w,
          centerY: (stats.minY + stats.maxY) / 2 / h,
          area: stats.count,
          value: 0, // will be assigned during tracking
        })
      }
    })

    return blobs
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
        // Update existing blob
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

    // Remove unmatched old blobs (with some persistence)
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

        // Detect blobs
        const threshold255 = currentParams.threshold * 255
        const minPixels = currentParams.minSize * 10 // scale minSize to pixel count
        let blobs = detectBlobs(imageData, threshold255, minPixels)

        // Limit blob count
        if (blobs.length > 30) {
          blobs = blobs.sort((a, b) => b.area - a.area).slice(0, 30)
        }

        // Track blobs
        const trackedBlobList = trackBlobs(blobs)

        // Get style colors
        const boxColor = currentParams.color || 'rgba(255, 200, 100, 0.8)'
        const lineColor = currentParams.glowColor || 'rgba(255, 255, 255, 0.7)'

        // Draw connecting lines between nearby blobs
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 1
        for (let i = 0; i < trackedBlobList.length; i++) {
          for (let j = i + 1; j < trackedBlobList.length; j++) {
            const a = trackedBlobList[i]
            const b = trackedBlobList[j]
            const dx = a.centerX - b.centerX
            const dy = a.centerY - b.centerY
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Connect blobs within a certain distance
            if (dist < 0.4) {
              ctx.beginPath()
              ctx.moveTo(a.centerX * currentWidth, a.centerY * currentHeight)
              ctx.lineTo(b.centerX * currentWidth, b.centerY * currentHeight)
              ctx.stroke()
            }
          }
        }

        // Draw bounding boxes and labels
        ctx.strokeStyle = boxColor
        ctx.lineWidth = 1.5
        ctx.font = '11px monospace'
        ctx.fillStyle = boxColor

        for (const blob of trackedBlobList) {
          const x = blob.x * currentWidth
          const y = blob.y * currentHeight
          const w = blob.width * currentWidth
          const h = blob.height * currentHeight

          // Draw box
          ctx.strokeRect(x, y, w, h)

          // Draw tracking value label
          const label = blob.value.toFixed(4)
          ctx.fillText(label, x + 4, y + h - 4)
        }

      } catch (err) {
        console.error('Blob detection error:', err)
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
