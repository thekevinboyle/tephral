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
    // GRID MATRIX - step sequencer style
    // ═══════════════════════════════════════════════════════════════
    const cellSize = 16
    const gap = 2
    const cellWithGap = cellSize + gap

    // Grid dimensions based on tracks and max steps
    const maxSteps = Math.max(...tracks.map(t => t.steps), 8)
    const rows = tracks.length
    const cols = maxSteps

    const gridWidth = cols * cellWithGap
    const gridHeight = rows * cellWithGap
    const startX = centerX - gridWidth / 2
    const startY = centerY - gridHeight / 2

    // Draw subtle grid background
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.06
    ctx.lineWidth = 1
    for (let row = 0; row <= rows; row++) {
      const y = startY + row * cellWithGap
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(startX + gridWidth, y)
      ctx.stroke()
    }
    for (let col = 0; col <= cols; col++) {
      const x = startX + col * cellWithGap
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, startY + gridHeight)
      ctx.stroke()
    }

    // Waterfall animation offset
    const waterfallSpeed = 30
    const waterfallOffset = (time * waterfallSpeed) % cellWithGap

    // Draw cells
    for (let row = 0; row < rows; row++) {
      const track = tracks[row]
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.15 : 1

      for (let col = 0; col < track.steps; col++) {
        const isHit = pattern[col]
        const isCurrent = col === track.currentStep

        const cellX = startX + col * cellWithGap
        const cellY = startY + row * cellWithGap

        // Waterfall effect - animate Y position
        const fallOffset = waterfallOffset * (1 + (col % 3) * 0.2)
        const animY = cellY + (fallOffset % (cellWithGap * 0.5)) - cellWithGap * 0.25

        if (isHit) {
          // Determine block size based on position and animation
          const sizeVariation = Math.sin(time * 2 + col * 0.5 + row * 0.3)
          const baseSize = isCurrent ? cellSize - 2 : cellSize - 4
          const blockSize = baseSize + sizeVariation * 2

          // Stacking effect - some hits get extra blocks above
          const stackHeight = isCurrent ? 2 + Math.floor(track.currentValue * 2) : 1 + ((col + row) % 2)

          for (let stack = 0; stack < stackHeight; stack++) {
            const stackY = animY - stack * (cellSize * 0.4)
            const stackSize = blockSize * (1 - stack * 0.2)
            const stackOpacity = 1 - stack * 0.3

            // Glow for current step
            if (isCurrent && stack === 0 && track.currentValue > 0.05 && !track.muted) {
              ctx.shadowColor = CREAM
              ctx.shadowBlur = 8 + track.currentValue * 10
            }

            ctx.fillStyle = CREAM
            ctx.globalAlpha = baseOpacity * stackOpacity * (isCurrent ? 0.9 : 0.5)

            const offset = (cellSize - stackSize) / 2
            ctx.fillRect(
              cellX + offset + gap / 2,
              stackY + offset + gap / 2,
              stackSize,
              stackSize
            )

            ctx.shadowBlur = 0
          }
        } else {
          // Small dot for empty steps
          ctx.fillStyle = CREAM
          ctx.globalAlpha = baseOpacity * 0.12

          const dotSize = 3
          ctx.beginPath()
          ctx.arc(
            cellX + cellSize / 2 + gap / 2,
            animY + cellSize / 2 + gap / 2,
            dotSize / 2,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // MICRO ELEMENTS - floating particles
    // ═══════════════════════════════════════════════════════════════
    for (let i = 0; i < 15; i++) {
      const seed = i * 137.5
      const x = centerX + Math.sin(seed + time * 0.1) * (gridWidth * 0.7)
      const y = centerY + Math.cos(seed + time * 0.08) * (gridHeight * 0.8)

      ctx.fillStyle = CREAM
      ctx.globalAlpha = 0.04 + Math.sin(time * 2 + i) * 0.02
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

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
