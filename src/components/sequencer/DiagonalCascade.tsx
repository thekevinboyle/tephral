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
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, width, height)

    // Grid settings - dense coverage
    const cellSize = 18
    const cols = Math.ceil(width / cellSize) + 2
    const rows = Math.ceil(height / cellSize) + 2

    // Block dimensions
    const blockW = 12
    const blockH = 4

    // Animated offsets
    const scrollX = (time * 25) % cellSize
    const scrollY = (time * 15) % cellSize

    // Draw dense grid of diagonal elements
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const baseX = col * cellSize - scrollX
        const baseY = row * cellSize - scrollY

        // Skip some cells for visual variety
        const cellHash = (col * 7 + row * 13) % 17
        if (cellHash < 4) continue

        // Determine which track/step this cell represents
        const trackIndex = Math.abs((col + row) % tracks.length)
        const track = tracks[trackIndex]
        if (!track) continue

        const pattern = getPattern(track.id)
        const stepIndex = Math.abs((col * 3 + row * 2 + Math.floor(time * track.clockDivider * 2)) % pattern.length)
        const isHit = pattern[stepIndex]
        const isCurrent = stepIndex === track.currentStep

        // Diagonal angle varies by position
        const angleBase = ((col + row) % 4) * 45 - 67.5
        const angleWobble = Math.sin(time * 3 + col * 0.5 + row * 0.3) * 8
        const angle = (angleBase + angleWobble) * Math.PI / 180

        // Position with wave distortion
        const waveX = Math.sin(time * 2 + row * 0.4) * 3
        const waveY = Math.cos(time * 1.5 + col * 0.3) * 3
        const x = baseX + waveX
        const y = baseY + waveY

        // Opacity based on pattern and distance from active hits
        let opacity = track.muted ? 0.08 : 0.15

        if (isHit) {
          opacity = track.muted ? 0.15 : 0.4
          if (isCurrent) {
            opacity = 0.7 + track.currentValue * 0.3
          }
        }

        // Pulse wave emanating from current steps
        if (isCurrent && track.currentValue > 0.1 && !track.muted) {
          const pulse = track.currentValue
          opacity = Math.min(1, opacity + pulse * 0.5)
        }

        // Size variation
        const sizeScale = isHit ? (isCurrent ? 1.2 + track.currentValue * 0.3 : 1) : 0.7
        const w = blockW * sizeScale
        const h = blockH * sizeScale

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)

        if (isHit) {
          // Glow for current hits
          if (isCurrent && track.currentValue > 0.1 && !track.muted) {
            ctx.shadowColor = CREAM
            ctx.shadowBlur = 8 + track.currentValue * 12
          }

          ctx.fillStyle = CREAM
          ctx.globalAlpha = opacity
          ctx.fillRect(-w / 2, -h / 2, w, h)
          ctx.shadowBlur = 0
        } else {
          // Dashed fragments for rests
          ctx.strokeStyle = CREAM
          ctx.globalAlpha = opacity
          ctx.lineWidth = 1.5
          ctx.setLineDash([2, 3])
          ctx.lineDashOffset = -time * 20 + col + row
          ctx.beginPath()
          ctx.moveTo(-w / 2, 0)
          ctx.lineTo(w / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.restore()
      }
    }

    // Add scanning line effect
    const scanY = ((time * 80) % (height + 40)) - 20
    ctx.fillStyle = CREAM
    ctx.globalAlpha = 0.06
    ctx.fillRect(0, scanY, width, 2)

    const scanX = ((time * 60) % (width + 40)) - 20
    ctx.globalAlpha = 0.04
    ctx.fillRect(scanX, 0, 2, height)

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
