import { useRef, useEffect } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useDetectionStore } from '../../stores/detectionStore'
import { AsciiRenderer } from '../../effects/vision/AsciiRenderEffect'

interface AsciiRenderOverlayProps {
  width: number
  height: number
}

export function AsciiRenderOverlay({ width, height }: AsciiRenderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<AsciiRenderer | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const { videoElement, imageElement } = useMediaStore()
  const { enabled, params } = useAsciiRenderStore()
  const { detections } = useDetectionStore()

  // Initialize renderer
  useEffect(() => {
    rendererRef.current = new AsciiRenderer(params)

    // Create offscreen canvas for sampling video
    offscreenCanvasRef.current = document.createElement('canvas')

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Update renderer params
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateParams(params)

      // Reinitialize matrix columns when mode changes
      if (params.mode === 'matrix') {
        rendererRef.current.initMatrix(width, height)
      }
    }
  }, [params, width, height])

  // Render loop
  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    const renderer = rendererRef.current

    if (!canvas || !offscreen || !renderer) return

    const ctx = canvas.getContext('2d')
    const offCtx = offscreen.getContext('2d')

    if (!ctx || !offCtx) return

    const render = () => {
      const now = performance.now()
      const deltaTime = (now - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = now

      // Get source
      const source = videoElement || imageElement
      if (!source) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      // Setup offscreen canvas
      offscreen.width = Math.floor(width / params.resolution)
      offscreen.height = Math.floor(height / params.resolution)

      // Draw source to offscreen (downscaled)
      offCtx.drawImage(source, 0, 0, offscreen.width, offscreen.height)

      // Get image data
      let imageData: ImageData | null = null
      try {
        imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height)
      } catch {
        // CORS issues with some sources
      }

      // Apply detection masking if enabled
      if (params.maskToDetections && detections.length > 0 && imageData) {
        const maskedData = new ImageData(imageData.width, imageData.height)

        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            const nx = x / imageData.width
            const ny = y / imageData.height

            // Check if point is inside any detection
            const insideDetection = detections.some(det =>
              nx >= det.bbox.x &&
              nx <= det.bbox.x + det.bbox.width &&
              ny >= det.bbox.y &&
              ny <= det.bbox.y + det.bbox.height
            )

            const idx = (y * imageData.width + x) * 4

            if (insideDetection) {
              maskedData.data[idx] = imageData.data[idx]
              maskedData.data[idx + 1] = imageData.data[idx + 1]
              maskedData.data[idx + 2] = imageData.data[idx + 2]
              maskedData.data[idx + 3] = 255
            } else {
              maskedData.data[idx] = 0
              maskedData.data[idx + 1] = 0
              maskedData.data[idx + 2] = 0
              maskedData.data[idx + 3] = 255
            }
          }
        }

        imageData = maskedData
      }

      // Render based on mode
      if (params.mode === 'matrix') {
        renderer.renderMatrix(ctx, imageData, width, height, deltaTime)
      } else if (imageData) {
        renderer.renderAscii(ctx, imageData, width, height)
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, videoElement, imageElement, params, width, height, detections])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
