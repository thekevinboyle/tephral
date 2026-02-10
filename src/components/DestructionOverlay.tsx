/**
 * DestructionOverlay.tsx
 * UI dimming overlay with chaotic raining glyph effects for Destruction Mode
 * Covers UI elements but excludes the canvas area
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'

// Arrow glyphs like acid effect
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
const GEOMETRIC = ['⬢', '◯', '▲', '◼', '◆', '●', '■', '▶', '△', '□', '◇']
const BLOCKS = ['█', '▓', '▒', '░', '▄', '▀']
const CHAOS = ['✕', '✖', '⚡', '☠', '⚠', '⌧', '⊗', '⊘']

// Configuration
const FADE_DURATION = 500
const SPAWN_RATE = 3 // glyphs per frame
const MAX_GLYPHS = 400

interface FallingGlyph {
  x: number
  y: number
  char: string
  speed: number
  rotation: number
  rotationSpeed: number
  scale: number
  alpha: number
  wobble: number
  wobbleSpeed: number
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
  const glyphsRef = useRef<FallingGlyph[]>([])
  const lastTimeRef = useRef<number>(0)

  // Visibility and fade states
  const [isVisible, setIsVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null)

  // Track the video canvas position
  useEffect(() => {
    if (!active) return

    const updateCanvasBounds = () => {
      const container = document.querySelector('[data-video-canvas-container]') as HTMLElement
      if (container) {
        const rect = container.getBoundingClientRect()
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
    const interval = setInterval(updateCanvasBounds, 100)

    return () => {
      window.removeEventListener('resize', updateCanvasBounds)
      clearInterval(interval)
    }
  }, [active])

  // Get random glyph from mixed sets
  const getRandomGlyph = useCallback(() => {
    const rand = Math.random()
    if (rand < 0.5) {
      return ARROWS[Math.floor(Math.random() * ARROWS.length)]
    } else if (rand < 0.75) {
      return GEOMETRIC[Math.floor(Math.random() * GEOMETRIC.length)]
    } else if (rand < 0.9) {
      return BLOCKS[Math.floor(Math.random() * BLOCKS.length)]
    } else {
      return CHAOS[Math.floor(Math.random() * CHAOS.length)]
    }
  }, [])

  // Create a new falling glyph
  const createGlyph = useCallback((width: number): FallingGlyph => {
    return {
      x: Math.random() * width,
      y: -30,
      char: getRandomGlyph(),
      speed: 2 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      scale: 0.6 + Math.random() * 1.0,
      alpha: 0.3 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.1,
    }
  }, [getRandomGlyph])

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

    const deltaTime = (time - lastTimeRef.current) / 16.67 // normalize to ~60fps
    lastTimeRef.current = time

    const { width, height } = canvas

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Spawn new glyphs
    if (glyphsRef.current.length < MAX_GLYPHS) {
      for (let i = 0; i < SPAWN_RATE; i++) {
        glyphsRef.current.push(createGlyph(width))
      }
    }

    // Update and draw glyphs
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const glyphs = glyphsRef.current
    for (let i = glyphs.length - 1; i >= 0; i--) {
      const g = glyphs[i]

      // Update position
      g.y += g.speed * deltaTime
      g.rotation += g.rotationSpeed * deltaTime
      g.wobble += g.wobbleSpeed * deltaTime

      // Wobble horizontally
      const wobbleX = Math.sin(g.wobble) * 2

      // Remove if off screen
      if (g.y > height + 50) {
        glyphs.splice(i, 1)
        continue
      }

      // Random glitch - change character
      if (Math.random() < 0.01) {
        g.char = getRandomGlyph()
      }

      // Random speed burst
      if (Math.random() < 0.005) {
        g.speed = 2 + Math.random() * 8
      }

      // Draw
      ctx.save()
      ctx.translate(g.x + wobbleX, g.y)
      ctx.rotate(g.rotation)
      ctx.scale(g.scale, g.scale)

      // Glitchy color variation
      const hue = Math.random() < 0.1 ? Math.random() * 360 : 0
      const sat = hue > 0 ? '70%' : '0%'
      const light = '90%'
      ctx.fillStyle = hue > 0
        ? `hsla(${hue}, ${sat}, ${light}, ${g.alpha})`
        : `rgba(255, 252, 240, ${g.alpha})`

      ctx.font = `${20 * g.scale}px monospace`
      ctx.fillText(g.char, 0, 0)

      ctx.restore()
    }

    // HEAVY horizontal glitch lines
    if (Math.random() < 0.2) {
      const lineY = Math.random() * height
      const lineHeight = 1 + Math.random() * 5
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.35})`
      ctx.fillRect(0, lineY, width, lineHeight)
    }

    // Multiple scan lines
    if (Math.random() < 0.15) {
      for (let i = 0; i < 5; i++) {
        const lineY = Math.random() * height
        ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})`
        ctx.fillRect(0, lineY, width, 1)
      }
    }

    // Vertical tears - more frequent
    if (Math.random() < 0.1) {
      const lineX = Math.random() * width
      const lineWidth = 1 + Math.random() * 4
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`
      ctx.fillRect(lineX, 0, lineWidth, height)
    }

    // Static burst patches - MORE FREQUENT AND LARGER
    if (Math.random() < 0.08) {
      const burstX = Math.random() * width
      const burstY = Math.random() * height
      const burstW = 40 + Math.random() * 120
      const burstH = 20 + Math.random() * 60

      const imageData = ctx.createImageData(burstW, burstH)
      for (let j = 0; j < imageData.data.length; j += 4) {
        const v = Math.random() * 255
        imageData.data[j] = v
        imageData.data[j + 1] = v
        imageData.data[j + 2] = v
        imageData.data[j + 3] = Math.random() * 150 + 80
      }
      ctx.putImageData(imageData, burstX, burstY)
    }

    // SCREEN FLICKER - entire overlay flash
    if (Math.random() < 0.04) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.25})`
      ctx.fillRect(0, 0, width, height)
    }

    // DROPOUT - black rectangle patches
    if (Math.random() < 0.06) {
      const dropX = Math.random() * width
      const dropY = Math.random() * height
      const dropW = 50 + Math.random() * 150
      const dropH = 30 + Math.random() * 80
      ctx.fillStyle = `rgba(0, 0, 0, ${0.7 + Math.random() * 0.3})`
      ctx.fillRect(dropX, dropY, dropW, dropH)
    }

    // Horizontal displacement bands
    if (Math.random() < 0.05) {
      const bandY = Math.random() * height
      const bandH = 10 + Math.random() * 40
      const offset = (Math.random() - 0.5) * 50
      // Shift a band of content
      ctx.save()
      ctx.translate(offset, 0)
      ctx.fillStyle = `rgba(255, 255, 255, 0.05)`
      ctx.fillRect(-offset, bandY, width, bandH)
      ctx.restore()
    }

    // Color channel glitch rectangles
    if (Math.random() < 0.03) {
      const gx = Math.random() * width
      const gy = Math.random() * height
      const gw = 30 + Math.random() * 80
      const gh = 20 + Math.random() * 50
      const colors = ['rgba(255,0,0,0.3)', 'rgba(0,255,0,0.3)', 'rgba(0,0,255,0.3)', 'rgba(255,0,255,0.3)', 'rgba(0,255,255,0.3)']
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      ctx.fillRect(gx, gy, gw, gh)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [createGlyph, getRandomGlyph])

  // Handle activation/deactivation with fade
  useEffect(() => {
    if (active) {
      setIsVisible(true)
      setOpacity(1)
    } else if (isVisible) {
      setOpacity(0)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        glyphsRef.current = [] // Clear glyphs on hide
      }, FADE_DURATION)
      return () => clearTimeout(timeout)
    }
  }, [active, isVisible])

  // Initialize and run animation when visible
  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      glyphsRef.current = [] // Reset glyphs on resize
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', updateSize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, animate])

  if (!isVisible) return null

  // Create clip-path to exclude the canvas area
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
      {/* Raining glyph overlay canvas with hole for video canvas */}
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
