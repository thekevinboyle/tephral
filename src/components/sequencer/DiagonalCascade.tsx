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

    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // ═══════════════════════════════════════════════════════════════
    // MICRO ELEMENTS - subtle background particles
    // ═══════════════════════════════════════════════════════════════
    const microCount = 30
    for (let i = 0; i < microCount; i++) {
      // Deterministic but animated positions
      const seed = i * 137.5
      const orbitRadius = 60 + (i % 8) * 25
      const orbitSpeed = 0.1 + (i % 5) * 0.05
      const angle = seed + time * orbitSpeed

      const x = centerX + Math.cos(angle) * orbitRadius + Math.sin(seed) * 80
      const y = centerY + Math.sin(angle) * orbitRadius * 0.6 + Math.cos(seed) * 50

      // Skip if outside bounds
      if (x < 10 || x > width - 10 || y < 10 || y > height - 10) continue

      // Tiny dots and dashes
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle * 2)

      ctx.fillStyle = CREAM
      ctx.globalAlpha = 0.08 + Math.sin(time * 2 + i) * 0.04

      if (i % 3 === 0) {
        // Tiny dot
        ctx.beginPath()
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Tiny dash
        ctx.fillRect(-3, -0.5, 6, 1)
      }

      ctx.restore()
    }

    // ═══════════════════════════════════════════════════════════════
    // CENTRAL STARBURST - main focal animation
    // ═══════════════════════════════════════════════════════════════
    const blockW = 14
    const blockH = 5
    const gap = 7

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.12 : 1

      // Each track gets 2 opposing diagonal arms
      const armAngle = (trackIndex / tracks.length) * 180
      const angles = [armAngle, armAngle + 180]

      angles.forEach(deg => {
        const angleRad = (deg * Math.PI) / 180

        // Draw pattern steps radiating outward
        for (let i = 0; i < pattern.length; i++) {
          const isHit = pattern[i]
          const isCurrent = i === track.currentStep

          // Distance from center with slight breathing
          const breathe = 1 + Math.sin(time * 1.5 + trackIndex) * 0.03
          const distance = (i + 1.5) * (blockW + gap) * breathe

          // Limit radius
          const maxRadius = Math.min(width, height) * 0.38
          if (distance > maxRadius) continue

          const x = centerX + Math.cos(angleRad) * distance
          const y = centerY + Math.sin(angleRad) * distance

          // Pulse scale for current step
          const scale = isCurrent ? 1 + track.currentValue * 0.4 : 1

          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angleRad)
          ctx.scale(scale, scale)

          if (isHit) {
            // Glow for active hits
            if (isCurrent && track.currentValue > 0.05 && !track.muted) {
              ctx.shadowColor = CREAM
              ctx.shadowBlur = 10 + track.currentValue * 18
            }

            ctx.fillStyle = CREAM
            ctx.globalAlpha = baseOpacity * (isCurrent ? 0.9 + track.currentValue * 0.1 : 0.5)
            ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH)
            ctx.shadowBlur = 0
          } else {
            // Dashed line for rests
            ctx.strokeStyle = CREAM
            ctx.globalAlpha = baseOpacity * 0.15
            ctx.lineWidth = 1.5
            ctx.setLineDash([3, 4])
            ctx.lineDashOffset = -time * 12
            ctx.beginPath()
            ctx.moveTo(-blockW / 2, 0)
            ctx.lineTo(blockW / 2, 0)
            ctx.stroke()
            ctx.setLineDash([])
          }

          ctx.restore()
        }
      })
    })

    // ═══════════════════════════════════════════════════════════════
    // CENTER PULSE - breathing core
    // ═══════════════════════════════════════════════════════════════
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / tracks.length
    const coreSize = 3 + totalPulse * 4

    ctx.beginPath()
    ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2)
    ctx.fillStyle = CREAM
    ctx.globalAlpha = 0.3 + totalPulse * 0.5
    ctx.fill()

    // Outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, 8 + totalPulse * 6, 0, Math.PI * 2)
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.1 + totalPulse * 0.2
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.globalAlpha = 1
  }, [tracks, getPattern, width, height])

  // Animation loop
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
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
