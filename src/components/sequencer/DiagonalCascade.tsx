import { useRef, useEffect, useCallback } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'

interface DiagonalCascadeProps {
  width: number
  height: number
}

export function DiagonalCascade({ width, height }: DiagonalCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tracks, getPattern } = usePolyEuclidStore()

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = timestamp / 1000

    // Clear with slight fade for trails
    ctx.fillStyle = 'rgba(10, 10, 10, 0.15)'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // ═══════════════════════════════════════════════════════════════
    // ORGANIC FLOWING PARTICLES
    // ═══════════════════════════════════════════════════════════════

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.1 : 1

      // Each track spawns flowing particles
      const particleCount = 40

      for (let i = 0; i < particleCount; i++) {
        const patternIdx = i % pattern.length
        const isHit = pattern[patternIdx]
        const isCurrent = patternIdx === track.currentStep

        // Organic flow paths using noise-like functions
        const seed = i * 73.1 + trackIndex * 137
        const flowTime = time * (0.3 + track.clockDivider * 0.2) + seed

        // Lissajous-like curves for organic movement
        const freqX = 1 + (i % 3) * 0.5
        const freqY = 1.5 + (i % 4) * 0.3
        const phaseX = seed * 0.1
        const phaseY = seed * 0.15

        const radius = 30 + (i % 8) * 15 + Math.sin(flowTime * 0.5) * 20

        const x = centerX + Math.sin(flowTime * freqX + phaseX) * radius * 1.5
        const y = centerY + Math.cos(flowTime * freqY + phaseY) * radius

        // Size based on hit and current state
        let size = isHit ? 3 + Math.sin(flowTime * 2) * 1.5 : 1.5
        if (isCurrent && !track.muted) {
          size += track.currentValue * 4
        }

        // Opacity varies
        let opacity = isHit ? 0.4 : 0.1
        if (isCurrent) {
          opacity = 0.6 + track.currentValue * 0.4
        }

        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = CREAM
        ctx.globalAlpha = baseOpacity * opacity

        // Glow on hits
        if (isCurrent && track.currentValue > 0.1 && !track.muted) {
          ctx.shadowColor = CREAM
          ctx.shadowBlur = 10 + track.currentValue * 15
        }

        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw flowing connection lines between nearby particles
      ctx.strokeStyle = CREAM
      ctx.lineWidth = 0.5
      ctx.globalAlpha = baseOpacity * 0.08

      for (let i = 0; i < particleCount - 1; i++) {
        const seed1 = i * 73.1 + trackIndex * 137
        const seed2 = (i + 1) * 73.1 + trackIndex * 137
        const flowTime = time * (0.3 + track.clockDivider * 0.2)

        const freqX1 = 1 + (i % 3) * 0.5
        const freqY1 = 1.5 + (i % 4) * 0.3
        const freqX2 = 1 + ((i + 1) % 3) * 0.5
        const freqY2 = 1.5 + ((i + 1) % 4) * 0.3

        const radius1 = 30 + (i % 8) * 15 + Math.sin((flowTime + seed1) * 0.5) * 20
        const radius2 = 30 + ((i + 1) % 8) * 15 + Math.sin((flowTime + seed2) * 0.5) * 20

        const x1 = centerX + Math.sin((flowTime + seed1) * freqX1 + seed1 * 0.1) * radius1 * 1.5
        const y1 = centerY + Math.cos((flowTime + seed1) * freqY1 + seed1 * 0.15) * radius1
        const x2 = centerX + Math.sin((flowTime + seed2) * freqX2 + seed2 * 0.1) * radius2 * 1.5
        const y2 = centerY + Math.cos((flowTime + seed2) * freqY2 + seed2 * 0.15) * radius2

        const dist = Math.hypot(x2 - x1, y2 - y1)
        if (dist < 50) {
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
    })

    // ═══════════════════════════════════════════════════════════════
    // CENTER BREATHING CORE
    // ═══════════════════════════════════════════════════════════════
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / tracks.length
    const breathe = Math.sin(time * 2) * 0.3 + 1

    // Outer glow rings
    for (let ring = 3; ring >= 0; ring--) {
      const ringSize = (8 + ring * 6) * breathe + totalPulse * 10
      ctx.beginPath()
      ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2)
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = (0.05 - ring * 0.01) + totalPulse * 0.1
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Core
    ctx.beginPath()
    ctx.arc(centerX, centerY, 3 + totalPulse * 5, 0, Math.PI * 2)
    ctx.fillStyle = CREAM
    ctx.globalAlpha = 0.3 + totalPulse * 0.5
    ctx.fill()

    ctx.globalAlpha = 1
  }, [tracks, getPattern, width, height])

  useEffect(() => {
    let animationId: number
    const loop = (timestamp: number) => {
      draw(timestamp)
      animationId = requestAnimationFrame(loop)
    }
    animationId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationId)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
