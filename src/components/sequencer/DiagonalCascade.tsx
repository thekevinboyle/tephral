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
    const microCount = 25
    for (let i = 0; i < microCount; i++) {
      const seed = i * 137.5
      const orbitRadius = 70 + (i % 6) * 30
      const orbitSpeed = 0.08 + (i % 4) * 0.03
      const angle = seed + time * orbitSpeed

      const x = centerX + Math.cos(angle) * orbitRadius + Math.sin(seed) * 60
      const y = centerY + Math.sin(angle) * orbitRadius * 0.5 + Math.cos(seed) * 40

      if (x < 10 || x > width - 10 || y < 10 || y > height - 10) continue

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle * 2)
      ctx.fillStyle = CREAM
      ctx.globalAlpha = 0.06 + Math.sin(time * 2 + i) * 0.03

      if (i % 3 === 0) {
        ctx.beginPath()
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-4, -0.5, 8, 1)
      }
      ctx.restore()
    }

    // ═══════════════════════════════════════════════════════════════
    // CENTRAL SAW-WAVE STARBURST
    // ═══════════════════════════════════════════════════════════════
    const blockW = 12
    const blockH = 4
    const baseGap = 3

    // Create 8 arms for dense X pattern like the reference
    const armCount = 8

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.1 : 1

      // Distribute this track's arms
      const armsPerTrack = Math.ceil(armCount / tracks.length)
      const startArm = trackIndex * armsPerTrack

      for (let armIdx = 0; armIdx < armsPerTrack; armIdx++) {
        const armNumber = (startArm + armIdx) % armCount
        const baseAngle = (armNumber / armCount) * 360
        const angleRad = (baseAngle * Math.PI) / 180

        // Draw saw-wave pattern - blocks staggered to create jagged edge
        for (let i = 0; i < pattern.length; i++) {
          const isHit = pattern[i]
          const isCurrent = i === track.currentStep

          // Saw-wave offset - creates jagged edge pattern
          const sawOffset = (i % 3) * 4 - 4
          const perpAngle = angleRad + Math.PI / 2

          // Distance with breathing
          const breathe = 1 + Math.sin(time * 1.2 + trackIndex + armIdx) * 0.04
          const distance = (i + 2) * (blockW + baseGap) * breathe

          const maxRadius = Math.min(width, height) * 0.4
          if (distance > maxRadius) continue

          // Position with saw-wave perpendicular offset
          const x = centerX + Math.cos(angleRad) * distance + Math.cos(perpAngle) * sawOffset
          const y = centerY + Math.sin(angleRad) * distance + Math.sin(perpAngle) * sawOffset

          const scale = isCurrent ? 1 + track.currentValue * 0.5 : 1

          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angleRad)
          ctx.scale(scale, scale)

          if (isHit) {
            if (isCurrent && track.currentValue > 0.05 && !track.muted) {
              ctx.shadowColor = CREAM
              ctx.shadowBlur = 8 + track.currentValue * 15
            }

            ctx.fillStyle = CREAM
            ctx.globalAlpha = baseOpacity * (isCurrent ? 0.85 + track.currentValue * 0.15 : 0.45)
            ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH)
            ctx.shadowBlur = 0
          } else {
            ctx.strokeStyle = CREAM
            ctx.globalAlpha = baseOpacity * 0.12
            ctx.lineWidth = 1.5
            ctx.setLineDash([2, 3])
            ctx.lineDashOffset = -time * 15
            ctx.beginPath()
            ctx.moveTo(-blockW / 2, 0)
            ctx.lineTo(blockW / 2, 0)
            ctx.stroke()
            ctx.setLineDash([])
          }

          ctx.restore()
        }

        // Add mirrored arm on opposite side for symmetry
        const mirrorAngle = angleRad + Math.PI

        for (let i = 0; i < pattern.length; i++) {
          const isHit = pattern[i]
          const isCurrent = i === track.currentStep

          const sawOffset = (i % 3) * 4 - 4
          const perpAngle = mirrorAngle + Math.PI / 2

          const breathe = 1 + Math.sin(time * 1.2 + trackIndex + armIdx) * 0.04
          const distance = (i + 2) * (blockW + baseGap) * breathe

          const maxRadius = Math.min(width, height) * 0.4
          if (distance > maxRadius) continue

          const x = centerX + Math.cos(mirrorAngle) * distance + Math.cos(perpAngle) * sawOffset
          const y = centerY + Math.sin(mirrorAngle) * distance + Math.sin(perpAngle) * sawOffset

          const scale = isCurrent ? 1 + track.currentValue * 0.5 : 1

          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(mirrorAngle)
          ctx.scale(scale, scale)

          if (isHit) {
            if (isCurrent && track.currentValue > 0.05 && !track.muted) {
              ctx.shadowColor = CREAM
              ctx.shadowBlur = 8 + track.currentValue * 15
            }

            ctx.fillStyle = CREAM
            ctx.globalAlpha = baseOpacity * (isCurrent ? 0.85 + track.currentValue * 0.15 : 0.45)
            ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH)
            ctx.shadowBlur = 0
          } else {
            ctx.strokeStyle = CREAM
            ctx.globalAlpha = baseOpacity * 0.12
            ctx.lineWidth = 1.5
            ctx.setLineDash([2, 3])
            ctx.lineDashOffset = -time * 15
            ctx.beginPath()
            ctx.moveTo(-blockW / 2, 0)
            ctx.lineTo(blockW / 2, 0)
            ctx.stroke()
            ctx.setLineDash([])
          }

          ctx.restore()
        }
      }
    })

    // ═══════════════════════════════════════════════════════════════
    // CENTER CORE
    // ═══════════════════════════════════════════════════════════════
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / tracks.length

    // Inner core
    ctx.beginPath()
    ctx.arc(centerX, centerY, 2 + totalPulse * 3, 0, Math.PI * 2)
    ctx.fillStyle = CREAM
    ctx.globalAlpha = 0.4 + totalPulse * 0.4
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
