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
  const timeRef = useRef(0)
  const { tracks, getPattern } = usePolyEuclidStore()

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = timestamp / 1000
    timeRef.current = time

    // Clear with dark background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Draw subtle grid
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.03
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

    const centerX = width / 2
    const centerY = height / 2

    // Draw each track as radiating diagonal lines from center
    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)

      // Each track gets multiple angles for the starburst effect
      // Distribute angles based on track index
      const angleOffset = (trackIndex / tracks.length) * 180
      const angles = [angleOffset, angleOffset + 90] // Two opposite directions

      const blockWidth = 14
      const blockHeight = 5
      const gap = 6
      const stepSpacing = blockWidth + gap

      const baseOpacity = track.muted ? 0.15 : 1

      angles.forEach(baseDeg => {
        const angleRad = (baseDeg * Math.PI) / 180

        // Draw pattern radiating outward from center in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
          for (let i = 0; i < pattern.length; i++) {
            const isHit = pattern[i]
            const isCurrent = i === track.currentStep

            // Distance from center
            const distance = (i + 1) * stepSpacing * 1.2

            // Slight wave animation
            const waveOffset = Math.sin(time * 2 + i * 0.3 + trackIndex) * 2

            const x = centerX + Math.cos(angleRad) * distance * dir
            const y = centerY + Math.sin(angleRad) * distance * dir + waveOffset

            // Skip if too far from center or off screen
            if (distance > Math.min(width, height) * 0.45) continue
            if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue

            const pulseScale = isCurrent ? 1 + track.currentValue * 0.3 : 1

            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(angleRad)
            ctx.scale(pulseScale, pulseScale)

            if (isHit) {
              // Glow on current step
              if (isCurrent && !track.muted && track.currentValue > 0.1) {
                ctx.shadowColor = CREAM
                ctx.shadowBlur = 12 + track.currentValue * 15
                ctx.fillStyle = CREAM
                ctx.globalAlpha = track.currentValue * baseOpacity * 0.8
                ctx.fillRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight)
                ctx.shadowBlur = 0
              }

              // Solid block
              ctx.fillStyle = CREAM
              ctx.globalAlpha = baseOpacity * (isCurrent ? 1 : 0.55)
              ctx.fillRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight)
            } else {
              // Dashed/fragmented for rests
              ctx.strokeStyle = CREAM
              ctx.globalAlpha = baseOpacity * 0.18
              ctx.lineWidth = 2
              ctx.setLineDash([3, 4])
              ctx.lineDashOffset = -time * 15
              ctx.beginPath()
              ctx.moveTo(-blockWidth / 2, 0)
              ctx.lineTo(blockWidth / 2, 0)
              ctx.stroke()
              ctx.setLineDash([])
            }

            ctx.restore()
          }
        }
      })
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
