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
    // MICRO ELEMENTS - subtle background
    // ═══════════════════════════════════════════════════════════════
    for (let i = 0; i < 20; i++) {
      const seed = i * 137.5
      const x = centerX + Math.sin(seed) * 120 + Math.cos(time * 0.1 + i) * 20
      const y = centerY + Math.cos(seed) * 80 + Math.sin(time * 0.15 + i) * 15

      if (x < 10 || x > width - 10 || y < 10 || y > height - 10) continue

      ctx.fillStyle = CREAM
      ctx.globalAlpha = 0.04 + Math.sin(time * 2 + i) * 0.02
      ctx.fillRect(x - 2, y - 0.5, 4, 1)
    }

    // ═══════════════════════════════════════════════════════════════
    // STACKED W PATTERN - zigzag rows
    // ═══════════════════════════════════════════════════════════════
    const blockW = 10
    const blockH = 4
    const zigzagAmp = 12 // Height of the W peaks
    const colSpacing = 14
    const rowSpacing = 20

    // Number of W rows (tracks control this)
    const rowCount = Math.min(tracks.length * 2, 8)
    const totalHeight = rowCount * rowSpacing
    const startY = centerY - totalHeight / 2

    // Columns across
    const colCount = Math.ceil(width * 0.6 / colSpacing)
    const totalWidth = colCount * colSpacing
    const startX = centerX - totalWidth / 2

    // Animation offset
    const wavePhase = time * 2

    for (let row = 0; row < rowCount; row++) {
      const trackIndex = row % tracks.length
      const track = tracks[trackIndex]
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.1 : 1

      const rowY = startY + row * rowSpacing

      for (let col = 0; col < colCount; col++) {
        const patternIdx = col % pattern.length
        const isHit = pattern[patternIdx]
        const isCurrent = patternIdx === track.currentStep

        // W shape: zigzag up and down
        let zigzagY: number

        // Create W shape: down, up, down, up pattern
        if (col % 4 === 0) zigzagY = 0           // bottom of V
        else if (col % 4 === 1) zigzagY = -zigzagAmp  // top left of W
        else if (col % 4 === 2) zigzagY = 0           // middle bottom of W
        else zigzagY = -zigzagAmp                     // top right of W

        // Animate the W - wave motion
        const animOffset = Math.sin(wavePhase + col * 0.3 + row * 0.5) * 3

        const x = startX + col * colSpacing
        const y = rowY + zigzagY + animOffset

        // Angle follows the W slope
        let angle = 0
        if (col % 4 === 0) angle = -45  // going up-left
        else if (col % 4 === 1) angle = 45   // going down-right
        else if (col % 4 === 2) angle = -45  // going up-left
        else angle = 45                       // going down-right

        const angleRad = (angle * Math.PI) / 180
        const scale = isCurrent ? 1 + track.currentValue * 0.5 : 1

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angleRad)
        ctx.scale(scale, scale)

        if (isHit) {
          if (isCurrent && track.currentValue > 0.05 && !track.muted) {
            ctx.shadowColor = CREAM
            ctx.shadowBlur = 6 + track.currentValue * 12
          }

          ctx.fillStyle = CREAM
          ctx.globalAlpha = baseOpacity * (isCurrent ? 0.9 + track.currentValue * 0.1 : 0.5)
          ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH)
          ctx.shadowBlur = 0
        } else {
          ctx.strokeStyle = CREAM
          ctx.globalAlpha = baseOpacity * 0.15
          ctx.lineWidth = 1.5
          ctx.setLineDash([2, 3])
          ctx.lineDashOffset = -time * 20
          ctx.beginPath()
          ctx.moveTo(-blockW / 2, 0)
          ctx.lineTo(blockW / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.restore()
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CENTER PULSE
    // ═══════════════════════════════════════════════════════════════
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / tracks.length

    ctx.beginPath()
    ctx.arc(centerX, centerY, 2 + totalPulse * 4, 0, Math.PI * 2)
    ctx.fillStyle = CREAM
    ctx.globalAlpha = 0.2 + totalPulse * 0.5
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
