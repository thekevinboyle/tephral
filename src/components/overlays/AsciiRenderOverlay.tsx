import { useRef, useEffect, useMemo } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { AsciiRenderer } from '../../effects/vision/AsciiRenderEffect'
import { calculateVideoArea } from '../../utils/videoArea'

interface AsciiRenderOverlayProps {
  width: number
  height: number
  glCanvas?: HTMLCanvasElement | null
}

export function AsciiRenderOverlay({ width, height, glCanvas }: AsciiRenderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<AsciiRenderer | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const { videoElement, imageElement } = useMediaStore()
  const { enabled, params } = useAsciiRenderStore()
  const { effectBypassed, bypassActive } = useGlitchEngineStore()

  // Check if ASCII is bypassed
  const isBypassed = bypassActive || effectBypassed['ascii']

  // GPU shader handles non-matrix modes, so only use Canvas 2D for matrix mode
  const useGpuShader = params.mode !== 'matrix'

  // Calculate video display area (respecting aspect ratio)
  const videoArea = useMemo(() => {
    const videoWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
    const videoHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height
    return calculateVideoArea(width, height, videoWidth, videoHeight)
  }, [width, height, videoElement, imageElement])

  // Initialize renderer
  useEffect(() => {
    rendererRef.current = new AsciiRenderer(params)
    offscreenCanvasRef.current = document.createElement('canvas')

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Update renderer params
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateParams(params)

      if (params.mode === 'matrix') {
        rendererRef.current.initMatrix(videoArea.displayWidth, videoArea.displayHeight)
      }
    }
  }, [params, videoArea])

  // Render loop
  useEffect(() => {
    // Skip Canvas 2D rendering when GPU shader handles it (non-matrix modes)
    if (!enabled || isBypassed || useGpuShader) {
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

      // Prefer WebGL canvas (has effects applied), fallback to original source
      const source = glCanvas || videoElement || imageElement
      if (!source) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      const { displayWidth, displayHeight, offsetX, offsetY } = videoArea

      // Clear entire canvas
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)

      // Setup offscreen canvas for sampling
      const sampleWidth = Math.floor(displayWidth / params.resolution)
      const sampleHeight = Math.floor(displayHeight / params.resolution)
      offscreen.width = sampleWidth
      offscreen.height = sampleHeight

      // Draw source to offscreen (downscaled)
      offCtx.drawImage(source, 0, 0, sampleWidth, sampleHeight)

      let imageData: ImageData | null = null
      try {
        imageData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight)
      } catch {
        // CORS issues
      }

      // Save context, translate to video area, render, then restore
      ctx.save()
      ctx.translate(offsetX, offsetY)

      if (params.mode === 'matrix') {
        renderer.renderMatrix(ctx, imageData, displayWidth, displayHeight, deltaTime)
      } else if (imageData) {
        renderer.renderAscii(ctx, imageData, displayWidth, displayHeight)
      }

      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, isBypassed, useGpuShader, videoElement, imageElement, glCanvas, params, width, height, videoArea])

  // Skip Canvas 2D rendering when GPU shader handles it (non-matrix modes)
  if (!enabled || isBypassed || useGpuShader) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
