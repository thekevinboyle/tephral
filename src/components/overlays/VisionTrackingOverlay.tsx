import { useRef, useEffect } from 'react'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
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
  value: number
  mode: string
  // Shape metrics
  compactness: number  // 4π*area/perimeter² - 1.0 = perfect circle
  extent: number       // area / bounding_box_area - how filled the box is
  aspectRatio: number  // width / height
}

// Downsampled resolution
const DOWNSAMPLE_WIDTH = 160
const DOWNSAMPLE_HEIGHT = 90

const TARGET_FPS = 20
const FRAME_INTERVAL = 1000 / TARGET_FPS

export function VisionTrackingOverlay({ width, height, glCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const frameIdRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const blobIdCounter = useRef<number>(0)
  const trackedBlobs = useRef<Map<string, Blob>>(new Map()) // key: mode-id

  // Store refs
  const storeRef = useRef(useVisionTrackingStore.getState())
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const imageElementRef = useRef<HTMLImageElement | null>(null)
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs
  const store = useVisionTrackingStore()
  const { videoElement, imageElement } = useMediaStore()

  storeRef.current = store
  videoElementRef.current = videoElement
  imageElementRef.current = imageElement
  glCanvasRef.current = glCanvas ?? null
  sizeRef.current = { width, height }

  const anyEnabled = store.brightEnabled || store.edgeEnabled ||
    store.colorEnabled || store.motionEnabled || store.faceEnabled || store.handsEnabled

  // Initialize
  useEffect(() => {
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = DOWNSAMPLE_WIDTH
    offscreenRef.current.height = DOWNSAMPLE_HEIGHT
    offscreenCtxRef.current = offscreenRef.current.getContext('2d', {
      willReadFrequently: true,
    })

    // Source canvas for box filter sampling
    sourceCanvasRef.current = document.createElement('canvas')
    sourceCtxRef.current = sourceCanvasRef.current.getContext('2d', {
      willReadFrequently: true,
    })

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
    }
  }, [])

  // Clear when all disabled
  useEffect(() => {
    if (!anyEnabled) {
      trackedBlobs.current.clear()
      prevFrameRef.current = null
    }
  }, [anyEnabled])

  // Detect blobs by brightness threshold
  function detectBrightness(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    return detectConnectedComponents(imageData, (r, g, b) => {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      return lum >= threshold
    }, minSize, 'bright')
  }

  // Detect blobs by edge detection (Sobel)
  function detectEdges(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const edges = new Uint8Array(w * h)

    // Sobel edge detection
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

    return detectFromBinaryArray(edges, w, h, minSize, 'edge')
  }

  // Detect blobs by color matching
  function detectColor(
    imageData: ImageData,
    targetColor: string,
    colorRange: number,
    minSize: number
  ): Blob[] {
    // Parse target color
    const match = targetColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (!match) return []
    const tr = parseInt(match[1], 16)
    const tg = parseInt(match[2], 16)
    const tb = parseInt(match[3], 16)
    const maxDist = colorRange * 441.67 // sqrt(255^2 * 3)

    return detectConnectedComponents(imageData, (r, g, b) => {
      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
      return dist <= maxDist
    }, minSize, 'color')
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

    return detectFromBinaryArray(motion, w, h, minSize, 'motion')
  }

  // Convert RGB to HSV
  function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : d / max
    const v = max

    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    return [h * 360, s, v]
  }

  // Detect skin-tone blobs
  function detectSkinTone(imageData: ImageData, threshold: number, minSize: number, mode: string): Blob[] {
    const satMin = 0.1
    const satMax = 0.2 + (threshold / 100) * 0.6

    return detectConnectedComponents(imageData, (r, g, b) => {
      const [h, s, v] = rgbToHsv(r, g, b)
      const hueMatch = (h >= 0 && h <= 50) || (h >= 340 && h <= 360)
      const satMatch = s >= satMin && s <= satMax
      const valMatch = v >= 0.2 && v <= 0.95
      return hueMatch && satMatch && valMatch
    }, minSize, mode)
  }

  // Detect faces - skin-tone blobs with face-like shape:
  // - High compactness (faces are oval/round shapes)
  // - High extent (faces fill their bounding box well)
  // - Aspect ratio close to 1 (not too wide or tall)
  // - In upper 75% of frame
  // - Reasonably large
  function detectFace(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    const allSkinBlobs = detectSkinTone(imageData, threshold, minSize, 'face')

    return allSkinBlobs.filter(blob => {
      // Face should be in upper 75% of frame
      if (blob.centerY > 0.75) return false

      // Face shape: high compactness (oval/circular)
      // Faces typically have compactness > 0.25
      if (blob.compactness < 0.25) return false

      // Face shape: high extent (fills bounding box well)
      // Faces typically fill 40%+ of their bounding box
      if (blob.extent < 0.4) return false

      // Aspect ratio should be face-like (0.5 to 1.8)
      if (blob.aspectRatio < 0.5 || blob.aspectRatio > 1.8) return false

      // Face should be reasonably large (at least 0.5% of frame area)
      const blobArea = blob.width * blob.height
      if (blobArea < 0.005) return false

      return true
    })
  }

  // Detect hands - skin-tone blobs with hand-like shape:
  // - Lower compactness than faces (irregular due to fingers)
  // - Lower extent (fingers create gaps)
  // - More varied aspect ratio
  // - Not face-like (exclude round blobs in upper frame)
  function detectHands(imageData: ImageData, threshold: number, minSize: number): Blob[] {
    const allSkinBlobs = detectSkinTone(imageData, threshold, minSize, 'hands')

    return allSkinBlobs.filter(blob => {
      const blobArea = blob.width * blob.height

      // Exclude very face-like blobs (high compactness + high extent + upper frame + ~1:1 aspect)
      const isFaceLike =
        blob.compactness > 0.35 &&
        blob.extent > 0.5 &&
        blob.centerY < 0.5 &&
        blob.aspectRatio > 0.6 && blob.aspectRatio < 1.5 &&
        blobArea > 0.015

      if (isFaceLike) return false

      // Hands typically have lower extent due to finger gaps
      // But not too low (would be noise)
      if (blob.extent < 0.15) return false

      // Hands should be medium-sized (not huge like a full torso)
      if (blobArea > 0.12) return false

      // Hands should have some minimum size
      if (blobArea < 0.002) return false

      return true
    })
  }

  // Generic connected component detection from RGBA data
  function detectConnectedComponents(
    imageData: ImageData,
    testFn: (r: number, g: number, b: number) => boolean,
    minSize: number,
    mode: string
  ): Blob[] {
    const w = imageData.width
    const h = imageData.height
    const data = imageData.data
    const binary = new Uint8Array(w * h)

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4
      binary[i] = testFn(data[idx], data[idx + 1], data[idx + 2]) ? 1 : 0
    }

    return detectFromBinaryArray(binary, w, h, minSize, mode)
  }

  // Connected component labeling from binary array with shape analysis
  function detectFromBinaryArray(
    binary: Uint8Array,
    w: number,
    h: number,
    minSize: number,
    mode: string
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

          // Check if this pixel is on the perimeter (has a non-blob neighbor)
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
        const boundingBoxArea = blobWidth * blobHeight

        // Compactness: 4π*area/perimeter² (1.0 = perfect circle)
        const perimeter = Math.max(s.perimeter, 1)
        const compactness = (4 * Math.PI * s.count) / (perimeter * perimeter)

        // Extent: how much of the bounding box is filled
        const extent = s.count / boundingBoxArea

        // Aspect ratio
        const aspectRatio = blobWidth / blobHeight

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
          mode,
          compactness: Math.min(compactness, 1), // Cap at 1
          extent,
          aspectRatio,
        })
      }
    })

    return blobs
  }

  // Track blobs across frames
  function trackBlobs(newBlobs: Blob[], mode: string): Blob[] {
    const tracked = trackedBlobs.current
    const matched = new Set<string>()
    const result: Blob[] = []

    for (const blob of newBlobs) {
      let bestMatch: string | null = null
      let bestDist = 0.15

      tracked.forEach((existing, key) => {
        if (!key.startsWith(mode + '-') || matched.has(key)) return
        const dx = blob.centerX - existing.centerX
        const dy = blob.centerY - existing.centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestDist) {
          bestDist = dist
          bestMatch = key
        }
      })

      if (bestMatch !== null) {
        matched.add(bestMatch)
        const existing = tracked.get(bestMatch)!
        blob.id = existing.id
        blob.value = existing.value + (1 / 7)
        tracked.set(bestMatch, blob)
        result.push(blob)
      } else {
        const newId = blobIdCounter.current++
        const key = `${mode}-${newId}`
        blob.id = newId
        blob.value = newId * (1 / 7)
        tracked.set(key, blob)
        result.push(blob)
      }
    }

    // Remove unmatched
    const toRemove: string[] = []
    tracked.forEach((_, key) => {
      if (key.startsWith(mode + '-') && !matched.has(key)) {
        toRemove.push(key)
      }
    })
    toRemove.forEach(key => tracked.delete(key))

    return result
  }

  // Apply filter to image data region
  function applyBoxFilter(
    sourceCtx: CanvasRenderingContext2D,
    destCtx: CanvasRenderingContext2D,
    blob: Blob,
    filter: string,
    intensity: number,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const x = Math.floor(blob.x * canvasWidth)
    const y = Math.floor(blob.y * canvasHeight)
    const bw = Math.ceil(blob.width * canvasWidth)
    const bh = Math.ceil(blob.height * canvasHeight)

    if (bw <= 0 || bh <= 0) return

    try {
      const imageData = sourceCtx.getImageData(x, y, bw, bh)
      const data = imageData.data
      const factor = intensity / 100

      switch (filter) {
        case 'pixel': {
          // Pixelate effect
          const pixelSize = Math.max(2, Math.floor(4 + factor * 16))
          for (let py = 0; py < bh; py += pixelSize) {
            for (let px = 0; px < bw; px += pixelSize) {
              // Get average color in block
              let r = 0, g = 0, b = 0, count = 0
              for (let dy = 0; dy < pixelSize && py + dy < bh; dy++) {
                for (let dx = 0; dx < pixelSize && px + dx < bw; dx++) {
                  const idx = ((py + dy) * bw + (px + dx)) * 4
                  r += data[idx]
                  g += data[idx + 1]
                  b += data[idx + 2]
                  count++
                }
              }
              r = Math.floor(r / count)
              g = Math.floor(g / count)
              b = Math.floor(b / count)
              // Apply to block
              for (let dy = 0; dy < pixelSize && py + dy < bh; dy++) {
                for (let dx = 0; dx < pixelSize && px + dx < bw; dx++) {
                  const idx = ((py + dy) * bw + (px + dx)) * 4
                  data[idx] = r
                  data[idx + 1] = g
                  data[idx + 2] = b
                }
              }
            }
          }
          break
        }
        case 'invert': {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i]
            data[i + 1] = 255 - data[i + 1]
            data[i + 2] = 255 - data[i + 2]
          }
          break
        }
        case 'grayscale': {
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            data[i] = gray
            data[i + 1] = gray
            data[i + 2] = gray
          }
          break
        }
        case 'thermal': {
          // Thermal/heat map effect
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            const t = gray / 255
            // Blue -> Cyan -> Green -> Yellow -> Red
            if (t < 0.25) {
              data[i] = 0
              data[i + 1] = t * 4 * 255
              data[i + 2] = 255
            } else if (t < 0.5) {
              data[i] = 0
              data[i + 1] = 255
              data[i + 2] = (1 - (t - 0.25) * 4) * 255
            } else if (t < 0.75) {
              data[i] = (t - 0.5) * 4 * 255
              data[i + 1] = 255
              data[i + 2] = 0
            } else {
              data[i] = 255
              data[i + 1] = (1 - (t - 0.75) * 4) * 255
              data[i + 2] = 0
            }
          }
          break
        }
        case 'edge': {
          // Simple edge detection
          const edgeData = new Uint8ClampedArray(data.length)
          const threshold = 30 + (1 - factor) * 50
          for (let py = 1; py < bh - 1; py++) {
            for (let px = 1; px < bw - 1; px++) {
              const idx = (py * bw + px) * 4
              const left = ((py * bw + px - 1) * 4)
              const right = ((py * bw + px + 1) * 4)
              const up = (((py - 1) * bw + px) * 4)
              const down = (((py + 1) * bw + px) * 4)

              const gx = Math.abs(data[right] - data[left])
              const gy = Math.abs(data[down] - data[up])
              const edge = gx + gy > threshold ? 255 : 0

              edgeData[idx] = edge
              edgeData[idx + 1] = edge
              edgeData[idx + 2] = edge
              edgeData[idx + 3] = 255
            }
          }
          for (let i = 0; i < data.length; i++) {
            data[i] = edgeData[i]
          }
          break
        }
        case 'saturate': {
          // Boost saturation
          const boost = 1 + factor * 2
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            data[i] = Math.min(255, gray + (data[i] - gray) * boost)
            data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * boost)
            data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * boost)
          }
          break
        }
        case 'blur': {
          // Simple box blur
          const radius = Math.max(1, Math.floor(factor * 5))
          const blurred = new Uint8ClampedArray(data.length)
          for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
              let r = 0, g = 0, b = 0, count = 0
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  const ny = py + dy, nx = px + dx
                  if (ny >= 0 && ny < bh && nx >= 0 && nx < bw) {
                    const idx = (ny * bw + nx) * 4
                    r += data[idx]
                    g += data[idx + 1]
                    b += data[idx + 2]
                    count++
                  }
                }
              }
              const idx = (py * bw + px) * 4
              blurred[idx] = r / count
              blurred[idx + 1] = g / count
              blurred[idx + 2] = b / count
              blurred[idx + 3] = data[idx + 3]
            }
          }
          for (let i = 0; i < data.length; i++) {
            data[i] = blurred[i]
          }
          break
        }
      }

      destCtx.putImageData(imageData, x, y)
    } catch (e) {
      // Ignore errors from accessing pixels outside canvas
    }
  }

  // Draw blobs
  function drawBlobs(
    ctx: CanvasRenderingContext2D,
    blobs: Blob[],
    boxColor: string,
    lineColor: string,
    showBoxes: boolean,
    showLines: boolean,
    showLabels: boolean,
    w: number,
    h: number,
    boxFilter?: string,
    boxFilterIntensity?: number,
    sourceCtx?: CanvasRenderingContext2D
  ) {
    // Apply box filters first (if enabled)
    if (boxFilter && boxFilter !== 'none' && sourceCtx && boxFilterIntensity !== undefined) {
      for (const blob of blobs) {
        applyBoxFilter(sourceCtx, ctx, blob, boxFilter, boxFilterIntensity, w, h)
      }
    }

    // Draw lines
    if (showLines && blobs.length > 1) {
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1
      for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
          const a = blobs[i]
          const b = blobs[j]
          const dist = Math.sqrt((a.centerX - b.centerX) ** 2 + (a.centerY - b.centerY) ** 2)
          if (dist < 0.4) {
            ctx.beginPath()
            ctx.moveTo(a.centerX * w, a.centerY * h)
            ctx.lineTo(b.centerX * w, b.centerY * h)
            ctx.stroke()
          }
        }
      }
    }

    // Draw boxes and labels
    if (showBoxes || showLabels) {
      ctx.strokeStyle = boxColor
      ctx.fillStyle = boxColor
      ctx.lineWidth = 1.5
      ctx.font = '10px monospace'

      for (const blob of blobs) {
        const x = blob.x * w
        const y = blob.y * h
        const bw = blob.width * w
        const bh = blob.height * h

        if (showBoxes) {
          ctx.strokeRect(x, y, bw, bh)
        }

        if (showLabels) {
          ctx.fillText(blob.value.toFixed(4), x + 3, y + bh - 3)
        }
      }
    }
  }

  // Animation loop
  useEffect(() => {
    if (!anyEnabled) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true

    const animate = (timestamp: number) => {
      if (!isRunningRef.current) return

      const elapsed = timestamp - lastFrameTimeRef.current
      if (elapsed < FRAME_INTERVAL) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTimeRef.current = timestamp

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const offscreenCtx = offscreenCtxRef.current
      if (!canvas || !ctx || !offscreenCtx) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      const currentStore = storeRef.current
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
      if (sourceWidth === 0) {
        frameIdRef.current = requestAnimationFrame(animate)
        return
      }

      // Lines only mode: fill with black
      if (currentStore.linesOnly) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, currentWidth, currentHeight)
      } else {
        ctx.clearRect(0, 0, currentWidth, currentHeight)
      }

      // Check if any box filters are enabled
      const needsSourceCanvas =
        (currentStore.brightEnabled && currentStore.brightParams.boxFilter !== 'none') ||
        (currentStore.edgeEnabled && currentStore.edgeParams.boxFilter !== 'none') ||
        (currentStore.colorEnabled && currentStore.colorParams.boxFilter !== 'none') ||
        (currentStore.motionEnabled && currentStore.motionParams.boxFilter !== 'none') ||
        (currentStore.faceEnabled && currentStore.faceParams.boxFilter !== 'none') ||
        (currentStore.handsEnabled && currentStore.handsParams.boxFilter !== 'none')

      // Prepare source canvas for box filter sampling
      const srcCanvas = sourceCanvasRef.current
      const srcCtx = sourceCtxRef.current
      if (needsSourceCanvas && srcCanvas && srcCtx) {
        srcCanvas.width = currentWidth
        srcCanvas.height = currentHeight
        srcCtx.drawImage(source, 0, 0, currentWidth, currentHeight)
      }

      try {
        offscreenCtx.drawImage(source, 0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)
        const imageData = offscreenCtx.getImageData(0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)

        // Brightness tracking
        if (currentStore.brightEnabled) {
          const p = currentStore.brightParams
          let blobs = detectBrightness(imageData, p.threshold, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'bright')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Edge tracking
        if (currentStore.edgeEnabled) {
          const p = currentStore.edgeParams
          let blobs = detectEdges(imageData, p.threshold, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'edge')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Color tracking
        if (currentStore.colorEnabled) {
          const p = currentStore.colorParams
          let blobs = detectColor(imageData, p.targetColor, p.colorRange, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'color')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Motion tracking
        if (currentStore.motionEnabled) {
          const p = currentStore.motionParams
          let blobs = detectMotion(imageData, prevFrameRef.current, p.sensitivity, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'motion')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Face tracking (skin-tone based with face-like filtering)
        if (currentStore.faceEnabled) {
          const p = currentStore.faceParams
          let blobs = detectFace(imageData, p.threshold, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'face')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Hands tracking (skin-tone based, smaller blobs)
        if (currentStore.handsEnabled) {
          const p = currentStore.handsParams
          let blobs = detectHands(imageData, p.threshold, p.minSize)
          if (blobs.length > p.maxBlobs) blobs = blobs.slice(0, p.maxBlobs)
          const tracked = trackBlobs(blobs, 'hands')
          drawBlobs(ctx, tracked, p.boxColor, p.lineColor, p.showBoxes, p.showLines, p.showLabels, currentWidth, currentHeight, p.boxFilter, p.boxFilterIntensity, srcCtx ?? undefined)
        }

        // Store current frame for motion detection
        prevFrameRef.current = imageData

      } catch (err) {
        console.error('Vision tracking error:', err)
      }

      frameIdRef.current = requestAnimationFrame(animate)
    }

    frameIdRef.current = requestAnimationFrame(animate)

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
    }
  }, [anyEnabled])

  if (!anyEnabled) return null

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
