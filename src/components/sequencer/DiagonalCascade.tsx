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
    ctx.fillStyle = 'rgba(10, 10, 10, 0.12)'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // Total pulse from all tracks
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / Math.max(tracks.length, 1)

    // ═══════════════════════════════════════════════════════════════
    // DOT GRID BACKGROUND (inspired by DataTerminal patterns)
    // ═══════════════════════════════════════════════════════════════
    const gridSize = 16
    const dotSpacing = Math.min(width, height) / gridSize
    const gridOffsetX = (width - (gridSize - 1) * dotSpacing) / 2
    const gridOffsetY = (height - (gridSize - 1) * dotSpacing) / 2

    ctx.fillStyle = CREAM

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = gridOffsetX + col * dotSpacing
        const y = gridOffsetY + row * dotSpacing

        // Distance from center
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.min(width, height) / 2

        // Angle for spiral effect
        const angle = Math.atan2(dy, dx)

        // Ripple waves from center
        const ripple = Math.sin(dist * 0.08 - time * 2 + totalPulse * 3) * 0.5 + 0.5

        // Spiral overlay
        const spiral = Math.sin(angle * 4 + dist * 0.05 - time * 1.5) * 0.5 + 0.5

        // Base dot size and opacity
        const baseOpacity = 0.05 + ripple * 0.1 * (1 - dist / maxDist)
        const dotSize = 1.5 + spiral * totalPulse * 2

        ctx.globalAlpha = baseOpacity
        ctx.beginPath()
        ctx.arc(x, y, dotSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACK RING ORBITS
    // ═══════════════════════════════════════════════════════════════

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.15 : 1

      // Each track gets a ring at different radius
      const trackRadius = 25 + trackIndex * 22
      const stepAngle = (Math.PI * 2) / pattern.length

      // Draw the orbit ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2)
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = baseOpacity * 0.08
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw each step on the ring
      pattern.forEach((isHit, stepIndex) => {
        const isCurrent = stepIndex === track.currentStep
        const angle = stepAngle * stepIndex - Math.PI / 2 + time * 0.1 * track.clockDivider

        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        // Size based on hit and current state
        let size = isHit ? 3.5 : 1.5
        if (isCurrent && !track.muted) {
          size += track.currentValue * 5
        }

        // Opacity varies
        let opacity = isHit ? 0.5 : 0.15
        if (isCurrent) {
          opacity = 0.7 + track.currentValue * 0.3
        }

        ctx.globalAlpha = baseOpacity * opacity

        // Glow on active hits
        if (isCurrent && track.currentValue > 0.1 && !track.muted) {
          ctx.shadowColor = CREAM
          ctx.shadowBlur = 8 + track.currentValue * 12
        }

        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = CREAM
        ctx.fill()

        ctx.shadowBlur = 0

        // Draw dashed lines for rests
        if (!isHit) {
          const nextAngle = angle + stepAngle * 0.4
          const x2 = centerX + Math.cos(nextAngle) * trackRadius
          const y2 = centerY + Math.sin(nextAngle) * trackRadius

          ctx.globalAlpha = baseOpacity * 0.08
          ctx.strokeStyle = CREAM
          ctx.lineWidth = 0.5
          ctx.setLineDash([2, 4])
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x2, y2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      })

      // Draw radial lines from current hit to center
      const currentHit = pattern[track.currentStep]
      if (currentHit && track.currentValue > 0.2 && !track.muted) {
        const angle = stepAngle * track.currentStep - Math.PI / 2 + time * 0.1 * track.clockDivider
        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        ctx.globalAlpha = baseOpacity * track.currentValue * 0.3
        ctx.strokeStyle = CREAM
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    })

    // ═══════════════════════════════════════════════════════════════
    // CENTER ANIMATED CORE (star pattern from DataTerminal)
    // ═══════════════════════════════════════════════════════════════
    const coreGridSize = 10
    const coreDotSpacing = 5
    const coreOffsetX = centerX - (coreGridSize - 1) * coreDotSpacing / 2
    const coreOffsetY = centerY - (coreGridSize - 1) * coreDotSpacing / 2
    const breathe = Math.sin(time * 2) * 0.3 + 1

    for (let row = 0; row < coreGridSize; row++) {
      for (let col = 0; col < coreGridSize; col++) {
        const x = coreOffsetX + col * coreDotSpacing
        const y = coreOffsetY + row * coreDotSpacing

        const dx = col - coreGridSize / 2 + 0.5
        const dy = row - coreGridSize / 2 + 0.5
        const angle = Math.atan2(dy, dx)
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Star shape: varies radius based on angle (4 points)
        const starRadius = 3 + Math.cos(angle * 4 + time * 2) * 1.5
        const onStar = dist < starRadius && dist > starRadius - 1.5
        const inCenter = dist < 1.5

        const visible = onStar || inCenter
        const pulse = Math.sin((time * 3 + col + row) * 0.3)

        if (visible) {
          ctx.globalAlpha = (0.4 + pulse * 0.4 + totalPulse * 0.3) * breathe
          ctx.beginPath()
          ctx.arc(x, y, 2 + totalPulse * 1.5, 0, Math.PI * 2)
          ctx.fillStyle = CREAM
          ctx.fill()
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // OUTER EXPANDING RINGS
    // ═══════════════════════════════════════════════════════════════
    for (let ring = 0; ring < 3; ring++) {
      const ringPhase = (time * 0.5 + ring * 0.33) % 1
      const ringRadius = 20 + ringPhase * 80
      const ringOpacity = (1 - ringPhase) * 0.15 * (0.5 + totalPulse * 0.5)

      ctx.beginPath()
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = ringOpacity
      ctx.lineWidth = 1
      ctx.stroke()
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
