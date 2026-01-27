import { useRef, useEffect, useCallback } from 'react'
import { useContourStore } from '../../stores/contourStore'
import { useMediaStore } from '../../stores/mediaStore'
import { MarchingSquares } from '../../effects/contour/MarchingSquares'
import { ContourTracker } from '../../effects/contour/ContourTracker'
import { OrganicRenderer, type RenderStyle } from '../../effects/contour/OrganicRenderer'

interface Props {
  width: number
  height: number
  glCanvas?: HTMLCanvasElement | null
}

// Downsampled resolution for contour extraction (performance optimization)
const DOWNSAMPLE_WIDTH = 320
const DOWNSAMPLE_HEIGHT = 180

export function ContourOverlay({ width, height, glCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const marchingSquares = useRef<MarchingSquares | null>(null)
  const tracker = useRef<ContourTracker | null>(null)
  const renderer = useRef<OrganicRenderer | null>(null)
  const frameId = useRef<number>(0)

  const { enabled, params } = useContourStore()
  const { videoElement, imageElement } = useMediaStore()

  // Initialize on mount
  useEffect(() => {
    marchingSquares.current = new MarchingSquares()
    tracker.current = new ContourTracker({ smoothing: params.positionSmoothing })
    renderer.current = new OrganicRenderer()

    // Create offscreen canvas for downsampling
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = DOWNSAMPLE_WIDTH
    offscreenRef.current.height = DOWNSAMPLE_HEIGHT
    offscreenCtxRef.current = offscreenRef.current.getContext('2d', {
      willReadFrequently: true,
    })

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
      // Clean up
      offscreenRef.current = null
      offscreenCtxRef.current = null
      marchingSquares.current = null
      tracker.current = null
      renderer.current = null
    }
  }, [])

  // Update smoothing when param changes
  useEffect(() => {
    tracker.current?.setSmoothing(params.positionSmoothing)
  }, [params.positionSmoothing])

  // Clear trails when disabled
  useEffect(() => {
    if (!enabled) {
      renderer.current?.clearTrails()
      tracker.current?.clear()
    }
  }, [enabled])

  const animate = useCallback(() => {
    if (!canvasRef.current || !enabled) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const offscreenCtx = offscreenCtxRef.current
    const offscreen = offscreenRef.current
    if (!offscreenCtx || !offscreen) return

    // Prefer WebGL canvas (has effects applied), fallback to original source
    const source = glCanvas || videoElement || imageElement
    if (!source) {
      frameId.current = requestAnimationFrame(animate)
      return
    }

    // Check if source has valid dimensions
    const sourceWidth = glCanvas?.width || videoElement?.videoWidth || imageElement?.naturalWidth || 0
    const sourceHeight = glCanvas?.height || videoElement?.videoHeight || imageElement?.naturalHeight || 0
    if (sourceWidth === 0 || sourceHeight === 0) {
      frameId.current = requestAnimationFrame(animate)
      return
    }

    const timestamp = performance.now()

    // Clear main canvas
    ctx.clearRect(0, 0, width, height)

    try {
      // 1. Draw source to offscreen canvas (downsampled)
      offscreenCtx.drawImage(source, 0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)

      // 2. Get image data
      const imageData = offscreenCtx.getImageData(0, 0, DOWNSAMPLE_WIDTH, DOWNSAMPLE_HEIGHT)

      // 3. Convert threshold from 0-1 to 0-255 for marching squares
      const threshold255 = params.threshold * 255

      // 4. Run marching squares to extract contours
      let contours = marchingSquares.current!.extract(
        imageData.data as unknown as Uint8Array,
        DOWNSAMPLE_WIDTH,
        DOWNSAMPLE_HEIGHT,
        threshold255
      )

      // 5. Simplify each contour based on contourSimplification param
      // epsilon scales with simplification value (0.1 multiplier for reasonable range)
      const epsilon = params.contourSimplification * 0.1
      if (epsilon > 0) {
        contours = contours.map(contour => ({
          ...contour,
          points: marchingSquares.current!.simplify(contour.points, epsilon),
        }))
      }

      // 6. Filter by minimum size (area)
      contours = contours.filter(c => c.area >= params.minSize)

      // 7. Update tracker with new contours
      const trackedContours = tracker.current!.update(contours, timestamp)

      // 8. Build RenderStyle from params
      const style: RenderStyle = {
        color: params.color,
        baseWidth: params.baseWidth,
        velocityResponse: params.velocityResponse,
        taperAmount: params.taperAmount,
        glowIntensity: params.glowIntensity,
        glowColor: params.glowColor,
      }

      // 9. Update trails
      renderer.current!.updateTrails(trackedContours, timestamp, params.trailLength, style)

      // 10. Render to main canvas
      renderer.current!.render(ctx, trackedContours, style, width, height, timestamp)

    } catch (err) {
      console.error('Contour extraction error:', err)
    }

    // Request next frame
    frameId.current = requestAnimationFrame(animate)
  }, [enabled, params, videoElement, imageElement, glCanvas, width, height])

  // Animation loop
  useEffect(() => {
    if (!enabled) return

    frameId.current = requestAnimationFrame(animate)

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
    }
  }, [enabled, animate])

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
