import { useRef, useEffect, useMemo } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useStippleStore } from '../../stores/stippleStore'
import { calculateVideoArea } from '../../utils/videoArea'

interface Particle {
  x: number
  y: number
  size: number
  brightness: number
  color: string
}

interface StippleOverlayProps {
  width: number
  height: number
}

export function StippleOverlay({ width, height }: StippleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number>(0)

  const { videoElement, imageElement } = useMediaStore()
  const { enabled, params } = useStippleStore()

  // Calculate video display area (respecting aspect ratio)
  const videoArea = useMemo(() => {
    const videoWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
    const videoHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height
    return calculateVideoArea(width, height, videoWidth, videoHeight)
  }, [width, height, videoElement, imageElement])

  // Initialize offscreen canvas
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas')

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Generate particles from image - positions relative to video display area
  const generateParticles = (imageData: ImageData, displayArea: typeof videoArea): Particle[] => {
    const particles: Particle[] = []
    const {
      density,
      brightnessThreshold,
      invertBrightness,
      jitter,
      particleSize,
      particleSizeVariation,
      colorMode,
      monoColor,
    } = params

    const { displayWidth, displayHeight, offsetX, offsetY } = displayArea
    const cellSize = 4 // Sample every N pixels

    for (let y = 0; y < imageData.height; y += cellSize) {
      for (let x = 0; x < imageData.width; x += cellSize) {
        const idx = (y * imageData.width + x) * 4
        const r = imageData.data[idx] || 0
        const g = imageData.data[idx + 1] || 0
        const b = imageData.data[idx + 2] || 0

        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        if (invertBrightness) brightness = 1 - brightness

        // Only place particles where brightness exceeds threshold
        if (brightness > brightnessThreshold) {
          // Number of particles proportional to brightness
          const particleCount = Math.floor(density * (brightness - brightnessThreshold) / (1 - brightnessThreshold))

          for (let i = 0; i < particleCount; i++) {
            const jitterX = (Math.random() - 0.5) * cellSize * jitter
            const jitterY = (Math.random() - 0.5) * cellSize * jitter

            // Position relative to video display area
            const px = offsetX + (x + jitterX) / imageData.width * displayWidth
            const py = offsetY + (y + jitterY) / imageData.height * displayHeight

            const size = particleSize * (1 + (Math.random() - 0.5) * particleSizeVariation)

            let color = monoColor
            if (colorMode === 'original') {
              color = `rgb(${r}, ${g}, ${b})`
            }

            particles.push({
              x: px,
              y: py,
              size,
              brightness,
              color,
            })
          }
        }
      }
    }

    return particles
  }

  // Render loop
  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current

    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d')
    const offCtx = offscreen.getContext('2d')

    if (!ctx || !offCtx) return

    let lastUpdateTime = 0
    const updateInterval = 100 // Update particles every 100ms for video

    const render = () => {
      const now = performance.now()
      const time = now / 1000

      // Clear canvas
      ctx.fillStyle = params.backgroundColor
      ctx.fillRect(0, 0, width, height)

      const source = videoElement || imageElement

      if (source) {
        // Update particles periodically
        if (now - lastUpdateTime > updateInterval || particlesRef.current.length === 0) {
          const srcWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
          const srcHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height

          offscreen.width = Math.min(srcWidth, 256) // Limit resolution
          offscreen.height = Math.min(srcHeight, 256)

          offCtx.drawImage(source, 0, 0, offscreen.width, offscreen.height)

          try {
            const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height)
            particlesRef.current = generateParticles(imageData, videoArea)
          } catch {
            // CORS issues
          }

          lastUpdateTime = now
        }
      }

      // Draw particles
      particlesRef.current.forEach((particle, idx) => {
        let size = particle.size

        if (params.breathe) {
          size *= 0.8 + 0.4 * Math.sin(time * params.animationSpeed * 2 + idx * 0.1)
        }

        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, videoElement, imageElement, params, width, height, videoArea])

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
