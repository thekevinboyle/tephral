import { useRef, useEffect, useCallback } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'
const GRID_SIZE = 20

interface DiagonalCascadeProps {
  width: number
  height: number
}

export function DiagonalCascade({ width, height }: DiagonalCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tracks, getPattern } = usePolyEuclidStore()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with dark background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Draw subtle grid
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.05
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += GRID_SIZE) {
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

    // Draw each track's diagonal
    const centerX = width / 2
    const centerY = height / 2

    for (const track of tracks) {
      const pattern = getPattern(track.id)
      const angleRad = (track.angle * Math.PI) / 180
      const blockSize = 12
      const gap = 4
      const totalLength = pattern.length * (blockSize + gap)

      // Calculate line start position (centered)
      const startX = centerX - (Math.cos(angleRad) * totalLength) / 2
      const startY = centerY - (Math.sin(angleRad) * totalLength) / 2

      // Track opacity based on mute state and current value
      const baseOpacity = track.muted ? 0.15 : 1
      const glowBoost = track.currentValue * 0.3

      for (let i = 0; i < pattern.length; i++) {
        const isHit = pattern[i]
        const isCurrent = i === track.currentStep

        const x = startX + Math.cos(angleRad) * i * (blockSize + gap)
        const y = startY + Math.sin(angleRad) * i * (blockSize + gap)

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angleRad)

        if (isHit) {
          // Solid block for hits
          ctx.fillStyle = CREAM
          ctx.globalAlpha = baseOpacity * (isCurrent ? 1 : 0.7) + (isCurrent ? glowBoost : 0)
          ctx.fillRect(-blockSize / 2, -blockSize / 4, blockSize, blockSize / 2)

          // Glow on current step
          if (isCurrent && !track.muted) {
            ctx.shadowColor = CREAM
            ctx.shadowBlur = 10 + track.currentValue * 15
            ctx.fillRect(-blockSize / 2, -blockSize / 4, blockSize, blockSize / 2)
            ctx.shadowBlur = 0
          }
        } else {
          // Dashed line for rests
          ctx.strokeStyle = CREAM
          ctx.globalAlpha = baseOpacity * 0.3
          ctx.lineWidth = 2
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(-blockSize / 2, 0)
          ctx.lineTo(blockSize / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.restore()
      }
    }
  }, [tracks, getPattern, width, height])

  // Animation loop
  useEffect(() => {
    let animationId: number

    const loop = () => {
      draw()
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
