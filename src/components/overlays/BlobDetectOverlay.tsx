import { useRef, useEffect, useCallback } from 'react'
import { useBlobDetectStore, type Blob, type TrailPoint } from '../../stores/blobDetectStore'
import { useMediaStore } from '../../stores/mediaStore'
import {
  BrightnessDetector,
  MotionDetector,
  ColorDetector,
  TrailSystem,
  BlobRenderer
} from '../../effects/blob-detect'

interface Props {
  width: number
  height: number
}

export function BlobDetectOverlay({ width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const brightnessDetector = useRef<BrightnessDetector | null>(null)
  const motionDetector = useRef<MotionDetector | null>(null)
  const colorDetector = useRef<ColorDetector | null>(null)
  const trailSystem = useRef<TrailSystem | null>(null)
  const renderer = useRef<BlobRenderer | null>(null)
  const frameId = useRef<number>(0)
  const trailsRef = useRef<TrailPoint[]>([])

  const { enabled, params, setBlobs, trails, setTrails, clearTrails } = useBlobDetectStore()
  const { videoElement, imageElement } = useMediaStore()

  // Keep trails ref in sync
  trailsRef.current = trails

  // Initialize detectors
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

  // Reset motion detector when mode changes
  useEffect(() => {
    if (params.mode !== 'motion' && motionDetector.current) {
      motionDetector.current.reset()
    }
  }, [params.mode])

  // Clear trails when disabled
  useEffect(() => {
    if (!enabled) {
      clearTrails()
      setBlobs([])
    }
  }, [enabled, clearTrails, setBlobs])

  const animate = useCallback(() => {
    if (!canvasRef.current || !enabled) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const source = videoElement || imageElement
    if (!source) {
      frameId.current = requestAnimationFrame(animate)
      return
    }

    // Check if source has valid dimensions
    const sourceWidth = videoElement?.videoWidth || imageElement?.naturalWidth || 0
    const sourceHeight = videoElement?.videoHeight || imageElement?.naturalHeight || 0
    if (sourceWidth === 0 || sourceHeight === 0) {
      frameId.current = requestAnimationFrame(animate)
      return
    }

    // Select detector based on mode
    let blobs: Blob[] = []
    try {
      switch (params.mode) {
        case 'brightness':
          blobs = brightnessDetector.current?.detect(source, params) || []
          break
        case 'motion':
          blobs = motionDetector.current?.detect(source, params) || []
          break
        case 'color':
          blobs = colorDetector.current?.detect(source, params) || []
          break
      }
    } catch (err) {
      console.error('Blob detection error:', err)
      blobs = []
    }

    setBlobs(blobs)

    // Process trails
    const timestamp = performance.now()
    const newTrails = trailSystem.current?.processFrame(
      blobs,
      trailsRef.current,
      params,
      timestamp
    ) || []

    // Update trails if changed
    if (newTrails.length !== trailsRef.current.length ||
        (newTrails.length > 0 && trailsRef.current.length > 0 &&
         newTrails[newTrails.length - 1]?.timestamp !== trailsRef.current[trailsRef.current.length - 1]?.timestamp)) {
      setTrails(newTrails)
    }

    // Render
    renderer.current?.render(ctx, blobs, newTrails, params, width, height, timestamp)

    frameId.current = requestAnimationFrame(animate)
  }, [enabled, params, videoElement, imageElement, width, height, setBlobs, setTrails])

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
