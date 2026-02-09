import { useRef, useEffect, useCallback } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'

interface DiagonalCascadeProps {
  width: number
  height: number
}

// Simple noise function for organic deformation
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
  return n - Math.floor(n)
}

// Draw an organic blob shape
function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  seed: number,
  lobes: number = 5
) {
  ctx.beginPath()
  const points: [number, number][] = []
  const segments = lobes * 4

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const noiseVal = noise(Math.cos(angle) + time * 0.5, Math.sin(angle) + time * 0.5, seed)
    const lobeFactor = 1 + Math.sin(angle * lobes + time * 2) * 0.3
    const radius = size * lobeFactor * (0.8 + noiseVal * 0.4)
    points.push([
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius
    ])
  }

  // Draw smooth curve through points
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2
    const yc = (points[i][1] + points[i + 1][1]) / 2
    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc)
  }
  ctx.closePath()
}

// Draw an organic wavy ring
function drawOrganicRing(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  time: number,
  seed: number,
  waves: number = 8,
  amplitude: number = 5
) {
  ctx.beginPath()
  const segments = 64

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const waveOffset = Math.sin(angle * waves + time * 1.5 + seed) * amplitude
    const noiseOffset = noise(Math.cos(angle) * 2, Math.sin(angle) * 2, seed + time * 0.3) * amplitude * 0.5
    const r = radius + waveOffset + noiseOffset

    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
}

// Draw organic tendril/vine
function drawTendril(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  time: number,
  seed: number,
  thickness: number = 1
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const segments = Math.max(8, Math.floor(dist / 5))

  ctx.beginPath()
  ctx.moveTo(x1, y1)

  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const baseX = x1 + dx * t
    const baseY = y1 + dy * t

    // Perpendicular offset for wave
    const perpX = -dy / dist
    const perpY = dx / dist
    const wave = Math.sin(t * Math.PI * 3 + time * 2 + seed) * (1 - t) * 8
    const noiseOff = noise(t * 10, seed, time) * 4 - 2

    const x = baseX + perpX * (wave + noiseOff)
    const y = baseY + perpY * (wave + noiseOff)

    ctx.lineTo(x, y)
  }

  ctx.lineWidth = thickness
  ctx.stroke()
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
    ctx.fillStyle = 'rgba(10, 10, 10, 0.1)'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // Total pulse from all tracks
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / Math.max(tracks.length, 1)

    // ═══════════════════════════════════════════════════════════════
    // ORGANIC GRID BACKGROUND
    // ═══════════════════════════════════════════════════════════════
    const gridSize = 12
    const dotSpacing = Math.min(width, height) / gridSize
    const gridOffsetX = (width - (gridSize - 1) * dotSpacing) / 2
    const gridOffsetY = (height - (gridSize - 1) * dotSpacing) / 2

    ctx.fillStyle = CREAM

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const baseX = gridOffsetX + col * dotSpacing
        const baseY = gridOffsetY + row * dotSpacing

        // Organic drift
        const drift = noise(col * 0.5, row * 0.5, time * 0.2) * 6 - 3
        const x = baseX + Math.sin(time + col * 0.5) * drift
        const y = baseY + Math.cos(time + row * 0.5) * drift

        // Distance from center
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.min(width, height) / 2

        // Ripple waves from center
        const ripple = Math.sin(dist * 0.06 - time * 1.5 + totalPulse * 3) * 0.5 + 0.5

        // Base opacity
        const baseOpacity = 0.04 + ripple * 0.08 * (1 - dist / maxDist)
        const blobSize = 2 + ripple * totalPulse * 3

        ctx.globalAlpha = baseOpacity
        drawBlob(ctx, x, y, blobSize, time, col * 13.7 + row * 7.3, 3)
        ctx.fill()
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ORGANIC TRACK ORBITS
    // ═══════════════════════════════════════════════════════════════

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.15 : 1

      // Each track gets an organic ring at different radius
      const trackRadius = 25 + trackIndex * 24
      const stepAngle = (Math.PI * 2) / pattern.length

      // Draw organic orbit ring
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = baseOpacity * 0.1
      ctx.lineWidth = 1
      drawOrganicRing(ctx, centerX, centerY, trackRadius, time, trackIndex * 17, 6 + trackIndex * 2, 3 + trackIndex)
      ctx.stroke()

      // Draw each step on the ring
      pattern.forEach((isHit, stepIndex) => {
        const isCurrent = stepIndex === track.currentStep
        const baseAngle = stepAngle * stepIndex - Math.PI / 2
        const rotationOffset = time * 0.08 * track.clockDivider

        // Get position on organic ring
        const waveOffset = Math.sin(baseAngle * (6 + trackIndex * 2) + time * 1.5 + trackIndex * 17) * (3 + trackIndex)
        const effectiveRadius = trackRadius + waveOffset

        const angle = baseAngle + rotationOffset
        const x = centerX + Math.cos(angle) * effectiveRadius
        const y = centerY + Math.sin(angle) * effectiveRadius

        // Size based on hit and current state
        let size = isHit ? 4 : 2
        if (isCurrent && !track.muted) {
          size += track.currentValue * 6
        }

        // Opacity varies
        let opacity = isHit ? 0.5 : 0.12
        if (isCurrent) {
          opacity = 0.75 + track.currentValue * 0.25
        }

        ctx.globalAlpha = baseOpacity * opacity
        ctx.fillStyle = CREAM

        // Glow on active hits
        if (isCurrent && track.currentValue > 0.1 && !track.muted) {
          ctx.shadowColor = CREAM
          ctx.shadowBlur = 10 + track.currentValue * 15
        }

        // Draw organic blob for hits, smaller blob for rests
        const lobes = isHit ? 5 + Math.floor(track.currentValue * 3) : 3
        drawBlob(ctx, x, y, size, time, stepIndex * 31.7 + trackIndex * 47, lobes)
        ctx.fill()

        ctx.shadowBlur = 0

        // Draw organic connection to next step for rests
        if (!isHit && stepIndex < pattern.length - 1) {
          const nextAngle = baseAngle + stepAngle + rotationOffset
          const nextWave = Math.sin((baseAngle + stepAngle) * (6 + trackIndex * 2) + time * 1.5 + trackIndex * 17) * (3 + trackIndex)
          const nextRadius = trackRadius + nextWave
          const x2 = centerX + Math.cos(nextAngle) * nextRadius
          const y2 = centerY + Math.sin(nextAngle) * nextRadius

          ctx.globalAlpha = baseOpacity * 0.06
          ctx.strokeStyle = CREAM
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x2, y2)
          ctx.lineWidth = 0.5
          ctx.stroke()
          ctx.setLineDash([])
        }
      })

      // Draw organic tendril from current hit to center
      const currentHit = pattern[track.currentStep]
      if (currentHit && track.currentValue > 0.15 && !track.muted) {
        const baseAngle = stepAngle * track.currentStep - Math.PI / 2
        const rotationOffset = time * 0.08 * track.clockDivider
        const waveOffset = Math.sin(baseAngle * (6 + trackIndex * 2) + time * 1.5 + trackIndex * 17) * (3 + trackIndex)
        const effectiveRadius = trackRadius + waveOffset
        const angle = baseAngle + rotationOffset

        const x = centerX + Math.cos(angle) * effectiveRadius
        const y = centerY + Math.sin(angle) * effectiveRadius

        ctx.globalAlpha = baseOpacity * track.currentValue * 0.35
        ctx.strokeStyle = CREAM
        drawTendril(ctx, centerX, centerY, x, y, time, trackIndex * 23 + track.currentStep * 7, 1 + track.currentValue)
      }
    })

    // ═══════════════════════════════════════════════════════════════
    // ORGANIC BREATHING CORE
    // ═══════════════════════════════════════════════════════════════
    const breathe = Math.sin(time * 1.5) * 0.2 + 1
    const coreSize = (12 + totalPulse * 15) * breathe

    // Outer organic glow layers
    for (let layer = 3; layer >= 0; layer--) {
      const layerSize = coreSize + layer * 8
      const layerOpacity = (0.08 - layer * 0.015) + totalPulse * 0.1

      ctx.globalAlpha = layerOpacity
      ctx.fillStyle = CREAM
      drawBlob(ctx, centerX, centerY, layerSize, time * 0.7, layer * 11, 6 + layer)
      ctx.fill()
    }

    // Core blob
    ctx.globalAlpha = 0.4 + totalPulse * 0.4
    ctx.fillStyle = CREAM
    ctx.shadowColor = CREAM
    ctx.shadowBlur = 15 + totalPulse * 20
    drawBlob(ctx, centerX, centerY, coreSize * 0.6, time, 777, 7)
    ctx.fill()
    ctx.shadowBlur = 0

    // ═══════════════════════════════════════════════════════════════
    // EXPANDING ORGANIC WAVES
    // ═══════════════════════════════════════════════════════════════
    for (let wave = 0; wave < 3; wave++) {
      const wavePhase = (time * 0.4 + wave * 0.33) % 1
      const waveRadius = 15 + wavePhase * 90
      const waveOpacity = (1 - wavePhase) * 0.12 * (0.5 + totalPulse * 0.5)

      ctx.strokeStyle = CREAM
      ctx.globalAlpha = waveOpacity
      ctx.lineWidth = 1 + (1 - wavePhase) * 0.5
      drawOrganicRing(ctx, centerX, centerY, waveRadius, time, wave * 37, 5 + wave * 2, 4 + wavePhase * 3)
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
