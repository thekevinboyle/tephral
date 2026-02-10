/**
 * DestructionOverlay.tsx
 * UI dimming overlay with matrix rain effects for Destruction Mode
 * Covers UI elements but excludes the canvas area
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'

// Character set for matrix rain
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?~`\u2591\u2592\u2593\u2588\u2580\u2584\u258C\u2590'

// Configuration
const FONT_SIZE = 14
const COLUMN_SPACING = FONT_SIZE
const DROP_SPEED_MIN = 0.3
const DROP_SPEED_MAX = 1.2
const GLITCH_PROBABILITY = 0.02
const TEAR_PROBABILITY = 0.005
const STATIC_BURST_PROBABILITY = 0.002
const FADE_DURATION = 500

interface Drop {
  x: number
  y: number
  speed: number
  chars: string[]
  length: number
  glitching: boolean
  reversed: boolean
}

interface CanvasBounds {
  top: number
  left: number
  width: number
  height: number
}

export function DestructionOverlay() {
  const active = useDestructionModeStore((s) => s.active)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const dropsRef = useRef<Drop[]>([])
  const lastTimeRef = useRef<number>(0)

  // Visibility and fade states
  const [isVisible, setIsVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)

  // Track the video canvas position
  useEffect(() => {
    if (!active) return

    const updateCanvasBounds = () => {
      // Find the main video canvas (the one inside the Canvas component)
      const videoCanvas = document.querySelector('canvas[data-engine="three.js"]') as HTMLCanvasElement
      if (videoCanvas) {
        const rect = videoCanvas.getBoundingClientRect()
        setCanvasBounds({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
      }
    }

    updateCanvasBounds()
    window.addEventListener('resize', updateCanvasBounds)

    // Update periodically in case layout shifts
    const interval = setInterval(updateCanvasBounds, 100)

    return () => {
      window.removeEventListener('resize', updateCanvasBounds)
      clearInterval(interval)
    }
  }, [active])

  // Initialize drops
  const initDrops = useCallback((width: number) => {
    const numColumns = Math.ceil(width / COLUMN_SPACING)
    const drops: Drop[] = []

    for (let i = 0; i < numColumns; i++) {
      drops.push(createDrop(i * COLUMN_SPACING, -Math.random() * 500))
    }

    dropsRef.current = drops
  }, [])

  // Create a single drop
  const createDrop = (x: number, y: number): Drop => {
    const length = Math.floor(Math.random() * 15) + 5
    const chars: string[] = []

    for (let i = 0; i < length; i++) {
      chars.push(CHARS[Math.floor(Math.random() * CHARS.length)])
    }

    return {
      x,
      y,
      speed: DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN),
      chars,
      length,
      glitching: false,
      reversed: false,
    }
  }

  // Draw a horizontal tear line
  const drawTear = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const y = Math.random() * height
    const tearHeight = Math.random() * 3 + 1

    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`
    ctx.fillRect(0, y, width, tearHeight)
  }

  // Draw a static burst rectangle
  const drawStaticBurst = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const burstX = Math.random() * width
    const burstY = Math.random() * height
    const burstWidth = Math.random() * 100 + 30
    const burstHeight = Math.random() * 60 + 20

    const imageData = ctx.createImageData(burstWidth, burstHeight)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255
      data[i] = noise     // R
      data[i + 1] = noise // G
      data[i + 2] = noise // B
      data[i + 3] = Math.random() * 150 + 50 // A
    }

    ctx.putImageData(imageData, burstX, burstY)
  }

  // Animation loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }

    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time

    const { width, height } = canvas

    // Fade effect - draw semi-transparent black over previous frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${FONT_SIZE}px monospace`

    // Update and draw drops
    const drops = dropsRef.current
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i]

      // Random glitch effects
      if (Math.random() < GLITCH_PROBABILITY) {
        drop.glitching = !drop.glitching
      }
      if (Math.random() < GLITCH_PROBABILITY * 0.5) {
        drop.reversed = !drop.reversed
      }

      // Update position
      const direction = drop.reversed ? -1 : 1
      const glitchOffset = drop.glitching ? (Math.random() - 0.5) * 10 : 0
      drop.y += drop.speed * direction * (deltaTime * 0.1) + glitchOffset

      // Draw characters in the drop
      for (let j = 0; j < drop.chars.length; j++) {
        const charY = drop.y - j * FONT_SIZE

        if (charY < 0 || charY > height) continue

        // Randomly change characters (glitch effect)
        if (drop.glitching && Math.random() < 0.1) {
          drop.chars[j] = CHARS[Math.floor(Math.random() * CHARS.length)]
        }

        // Color gradient: bright green at head, fading to dark
        const brightness = 1 - (j / drop.chars.length)
        const green = Math.floor(100 + brightness * 155)
        const alpha = brightness * 0.8 + 0.2

        // First character is brightest (white-ish)
        if (j === 0) {
          ctx.fillStyle = `rgba(200, 255, 200, ${alpha})`
        } else {
          ctx.fillStyle = `rgba(0, ${green}, 50, ${alpha})`
        }

        // Apply horizontal glitch offset
        const xOffset = drop.glitching ? (Math.random() - 0.5) * 5 : 0
        ctx.fillText(drop.chars[j], drop.x + xOffset, charY)
      }

      // Reset drop when it goes off screen
      if (drop.y - drop.length * FONT_SIZE > height) {
        drops[i] = createDrop(drop.x, -drop.length * FONT_SIZE)
      } else if (drop.y < -drop.length * FONT_SIZE && drop.reversed) {
        drops[i] = createDrop(drop.x, height + drop.length * FONT_SIZE)
      }
    }

    // Random horizontal tear lines
    if (Math.random() < TEAR_PROBABILITY) {
      drawTear(ctx, width, height)
    }

    // Random static burst rectangles
    if (Math.random() < STATIC_BURST_PROBABILITY) {
      drawStaticBurst(ctx, width, height)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  // Handle activation/deactivation with fade
  useEffect(() => {
    if (active) {
      // Instant activation
      setIsVisible(true)
      setOpacity(1)
    } else if (isVisible) {
      // Fade out on deactivation
      setOpacity(0)
      const timeout = setTimeout(() => {
        setIsVisible(false)
      }, FADE_DURATION)
      return () => clearTimeout(timeout)
    }
  }, [active, isVisible])

  // Initialize and run animation when visible
  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size to window size
    const updateSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initDrops(canvas.width)
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    // Start animation
    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', updateSize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, animate, initDrops])

  if (!isVisible) return null

  // Create clip-path to exclude the canvas area
  // polygon() creates a shape that covers everything EXCEPT the canvas
  const clipPath = canvasBounds
    ? `polygon(
        0% 0%,
        0% 100%,
        ${canvasBounds.left}px 100%,
        ${canvasBounds.left}px ${canvasBounds.top}px,
        ${canvasBounds.left + canvasBounds.width}px ${canvasBounds.top}px,
        ${canvasBounds.left + canvasBounds.width}px ${canvasBounds.top + canvasBounds.height}px,
        ${canvasBounds.left}px ${canvasBounds.top + canvasBounds.height}px,
        ${canvasBounds.left}px 100%,
        100% 100%,
        100% 0%
      )`
    : undefined

  return (
    <>
      {/* Dark dim layer with hole for canvas */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          clipPath,
          opacity,
          transition: `opacity ${FADE_DURATION}ms ease-out`,
        }}
      />
      {/* Glitch overlay canvas with hole for video canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          pointerEvents: 'none',
          clipPath,
          opacity,
          transition: `opacity ${FADE_DURATION}ms ease-out`,
        }}
      />
    </>
  )
}
