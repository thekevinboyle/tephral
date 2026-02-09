import { useRef, useEffect, useCallback } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'
const GRID_SIZE = 24

interface DiagonalCascadeProps {
  width: number
  height: number
}

export function DiagonalCascade({ width, height }: DiagonalCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const { tracks, getPattern } = usePolyEuclidStore()

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Track time for animations
    const time = timestamp / 1000
    timeRef.current = time

    // Clear with dark background
    ctx.fillStyle = '#0c0c0c'
    ctx.fillRect(0, 0, width, height)

    // Draw subtle animated grid
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.04
    ctx.lineWidth = 1
    const gridOffset = (time * 10) % GRID_SIZE
    for (let x = -GRID_SIZE + gridOffset; x < width + GRID_SIZE; x += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Calculate track spacing - distribute vertically as waves
    const trackCount = tracks.length
    const trackHeight = height / (trackCount + 1)
    const angle = -25 // degrees - gentle diagonal
    const angleRad = (angle * Math.PI) / 180

    // Draw each track as a wave of diagonal elements
    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseY = trackHeight * (trackIndex + 1)

      // Wave animation offset per track
      const waveOffset = Math.sin(time * 2 + trackIndex * 0.8) * 8
      const driftOffset = (time * 15 * track.clockDivider) % 50

      // Block sizing
      const blockWidth = 16
      const blockHeight = 6
      const gap = 12
      const stepSpacing = blockWidth + gap

      // Calculate how many steps fit across the width (with extra for scrolling)
      const stepsVisible = Math.ceil(width / stepSpacing) + 4

      // Draw repeating pattern across width
      for (let i = -2; i < stepsVisible; i++) {
        const patternIndex = ((i % pattern.length) + pattern.length) % pattern.length
        const isHit = pattern[patternIndex]
        const isCurrent = patternIndex === track.currentStep

        // Position with wave motion and drift
        const baseX = i * stepSpacing - driftOffset
        const x = baseX + Math.cos(angleRad) * (baseY * 0.3)
        const y = baseY + waveOffset + Math.sin(baseX * 0.02 + time) * 4

        // Skip if off screen
        if (x < -blockWidth * 2 || x > width + blockWidth * 2) continue

        const baseOpacity = track.muted ? 0.15 : 1
        const pulseOpacity = isCurrent ? 0.3 + track.currentValue * 0.7 : 0

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angleRad)

        if (isHit) {
          // Glow effect for current step
          if (isCurrent && !track.muted && track.currentValue > 0.1) {
            ctx.shadowColor = CREAM
            ctx.shadowBlur = 15 + track.currentValue * 20
            ctx.fillStyle = CREAM
            ctx.globalAlpha = pulseOpacity * baseOpacity
            ctx.fillRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight)
            ctx.shadowBlur = 0
          }

          // Main solid block
          ctx.fillStyle = CREAM
          ctx.globalAlpha = baseOpacity * (isCurrent ? 1 : 0.6)
          ctx.fillRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight)
        } else {
          // Dashed line for rests - animated dash offset
          ctx.strokeStyle = CREAM
          ctx.globalAlpha = baseOpacity * 0.2
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.lineDashOffset = -time * 20
          ctx.beginPath()
          ctx.moveTo(-blockWidth / 2, 0)
          ctx.lineTo(blockWidth / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.restore()
      }

      // Draw track indicator line on the left
      ctx.fillStyle = CREAM
      ctx.globalAlpha = track.muted ? 0.1 : 0.3 + track.currentValue * 0.4
      ctx.fillRect(8, baseY + waveOffset - 1, 3, 2)
    })

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
