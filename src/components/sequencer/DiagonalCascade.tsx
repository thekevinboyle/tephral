import { useRef, useEffect, useCallback, useState } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'
const STRAND_BLUE = '#3a7ca5'

interface DiagonalCascadeProps {
  width: number
  height: number
}

interface StrandNode {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  trackIndex: number
}

// Kojima-style strand connection drawing
function drawStrand(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  time: number,
  intensity: number = 1
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return

  const segments = Math.max(12, Math.floor(dist / 4))

  // Draw multiple strand lines for depth
  for (let strand = 0; strand < 3; strand++) {
    const strandOffset = (strand - 1) * 2

    ctx.beginPath()
    ctx.moveTo(x1, y1)

    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      const baseX = x1 + dx * t
      const baseY = y1 + dy * t

      // Perpendicular for wave
      const perpX = -dy / dist
      const perpY = dx / dist

      // Catenary-like sag + wave motion
      const sag = Math.sin(t * Math.PI) * dist * 0.08
      const wave = Math.sin(t * Math.PI * 4 - time * 3) * 3 * (1 - Math.abs(t - 0.5) * 2)

      const x = baseX + perpX * (sag + wave + strandOffset)
      const y = baseY + perpY * (sag + wave + strandOffset) + sag * 0.5

      ctx.lineTo(x, y)
    }

    ctx.strokeStyle = strand === 1 ? CREAM : STRAND_BLUE
    ctx.globalAlpha = intensity * (strand === 1 ? 0.6 : 0.2)
    ctx.lineWidth = strand === 1 ? 1.5 : 0.5
    ctx.stroke()
  }
}

// Elektron-style grid node
function drawGridNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  active: boolean,
  highlight: boolean,
  time: number
) {
  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, size + 2, 0, Math.PI * 2)
  ctx.strokeStyle = CREAM
  ctx.globalAlpha = highlight ? 0.5 : 0.15
  ctx.lineWidth = 1
  ctx.stroke()

  // Inner fill
  if (active) {
    const pulse = Math.sin(time * 4) * 0.2 + 0.8
    ctx.beginPath()
    ctx.arc(x, y, size * pulse, 0, Math.PI * 2)
    ctx.fillStyle = CREAM
    ctx.globalAlpha = highlight ? 0.9 : 0.6
    ctx.fill()

    // Glow
    if (highlight) {
      ctx.shadowColor = CREAM
      ctx.shadowBlur = 15
      ctx.fill()
      ctx.shadowBlur = 0
    }
  } else {
    // Cross pattern for inactive
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.moveTo(x - size * 0.5, y)
    ctx.lineTo(x + size * 0.5, y)
    ctx.moveTo(x, y - size * 0.5)
    ctx.lineTo(x, y + size * 0.5)
    ctx.strokeStyle = CREAM
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

// Draw BB pod inspired core
function drawBBCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pulse: number,
  time: number
) {
  // Outer container ring
  ctx.beginPath()
  ctx.arc(x, y, size + 8, 0, Math.PI * 2)
  ctx.strokeStyle = CREAM
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 2
  ctx.stroke()

  // Tech ring segments
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time * 0.2
    const segmentLength = 0.3
    ctx.beginPath()
    ctx.arc(x, y, size + 4, angle, angle + segmentLength)
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.3 + pulse * 0.2
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Inner glow layers
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
  gradient.addColorStop(0, `rgba(232, 228, 217, ${0.4 + pulse * 0.4})`)
  gradient.addColorStop(0.5, `rgba(232, 228, 217, ${0.1 + pulse * 0.2})`)
  gradient.addColorStop(1, 'rgba(232, 228, 217, 0)')

  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.globalAlpha = 1
  ctx.fill()

  // Core heartbeat
  const heartbeat = Math.pow(Math.sin(time * 2), 8) * pulse
  ctx.beginPath()
  ctx.arc(x, y, 4 + heartbeat * 8, 0, Math.PI * 2)
  ctx.fillStyle = CREAM
  ctx.globalAlpha = 0.8
  ctx.shadowColor = CREAM
  ctx.shadowBlur = 20 + heartbeat * 30
  ctx.fill()
  ctx.shadowBlur = 0
}

export function DiagonalCascade({ width, height }: DiagonalCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tracks, getPattern } = usePolyEuclidStore()
  const [mousePos, setMousePos] = useState({ x: width / 2, y: height / 2 })
  const [isHovering, setIsHovering] = useState(false)
  const [clickRipples, setClickRipples] = useState<{ x: number; y: number; time: number }[]>([])
  const strandNodesRef = useRef<StrandNode[]>([])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height)
    })
  }, [width, height])

  const handleMouseEnter = useCallback(() => setIsHovering(true), [])
  const handleMouseLeave = useCallback(() => setIsHovering(false), [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (width / rect.width)
    const y = (e.clientY - rect.top) * (height / rect.height)

    setClickRipples(prev => [...prev.slice(-5), { x, y, time: performance.now() }])

    // Spawn strand nodes on click
    const nodes = strandNodesRef.current
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      nodes.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1,
        maxLife: 2 + Math.random() * 2,
        trackIndex: Math.floor(Math.random() * tracks.length)
      })
    }
    // Limit nodes
    if (nodes.length > 50) nodes.splice(0, nodes.length - 50)
  }, [width, height, tracks.length])

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = timestamp / 1000

    // Clear with fade
    ctx.fillStyle = 'rgba(10, 10, 10, 0.15)'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // Total pulse from all tracks
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / Math.max(tracks.length, 1)

    // Mouse influence
    const mouseDist = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2))
    const mouseInfluence = isHovering ? Math.max(0, 1 - mouseDist / 150) : 0

    // ═══════════════════════════════════════════════════════════════
    // CLICK RIPPLES
    // ═══════════════════════════════════════════════════════════════
    const now = performance.now()
    setClickRipples(prev => prev.filter(r => now - r.time < 1500))

    clickRipples.forEach(ripple => {
      const age = (now - ripple.time) / 1000
      const radius = age * 100
      const opacity = Math.max(0, 1 - age / 1.5)

      ctx.beginPath()
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = opacity * 0.4
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner ring
      ctx.beginPath()
      ctx.arc(ripple.x, ripple.y, radius * 0.6, 0, Math.PI * 2)
      ctx.globalAlpha = opacity * 0.2
      ctx.stroke()
    })

    // ═══════════════════════════════════════════════════════════════
    // ELEKTRON-STYLE GRID BASELINE
    // ═══════════════════════════════════════════════════════════════
    const gridCols = 16
    const cellWidth = width / (gridCols + 2)
    const gridStartY = height * 0.85

    // Draw grid baseline
    ctx.beginPath()
    ctx.moveTo(cellWidth, gridStartY)
    ctx.lineTo(width - cellWidth, gridStartY)
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.1
    ctx.lineWidth = 1
    ctx.stroke()

    // ═══════════════════════════════════════════════════════════════
    // STRAND NETWORK CONNECTIONS
    // ═══════════════════════════════════════════════════════════════

    // Collect all active node positions
    const activeNodes: { x: number; y: number; intensity: number; trackIndex: number }[] = []

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      if (track.muted) return

      const trackRadius = 30 + trackIndex * 25
      const stepAngle = (Math.PI * 2) / pattern.length

      pattern.forEach((isHit, stepIndex) => {
        if (!isHit) return
        const isCurrent = stepIndex === track.currentStep

        const angle = stepAngle * stepIndex - Math.PI / 2 + time * 0.05 * track.clockDivider
        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        activeNodes.push({
          x, y,
          intensity: isCurrent ? 0.5 + track.currentValue * 0.5 : 0.2,
          trackIndex
        })
      })
    })

    // Draw strands between nearby nodes (Kojima connection style)
    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        const a = activeNodes[i]
        const b = activeNodes[j]
        const dist = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))

        if (dist < 80 && dist > 10) {
          const intensity = (1 - dist / 80) * Math.min(a.intensity, b.intensity)
          drawStrand(ctx, a.x, a.y, b.x, b.y, time, intensity)
        }
      }

      // Connect to mouse if hovering
      if (isHovering) {
        const a = activeNodes[i]
        const dist = Math.sqrt(Math.pow(mousePos.x - a.x, 2) + Math.pow(mousePos.y - a.y, 2))
        if (dist < 100 && dist > 10) {
          const intensity = (1 - dist / 100) * a.intensity * 0.5
          drawStrand(ctx, a.x, a.y, mousePos.x, mousePos.y, time, intensity)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FLOATING STRAND NODES (from clicks)
    // ═══════════════════════════════════════════════════════════════
    const nodes = strandNodesRef.current
    const dt = 0.016

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      node.x += node.vx
      node.y += node.vy
      node.vy += 0.02 // gentle gravity
      node.vx *= 0.99
      node.vy *= 0.99
      node.life -= dt / node.maxLife

      if (node.life <= 0) {
        nodes.splice(i, 1)
        continue
      }

      // Draw node
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.size * node.life, 0, Math.PI * 2)
      ctx.fillStyle = CREAM
      ctx.globalAlpha = node.life * 0.6
      ctx.fill()

      // Connect to nearby active nodes
      for (const active of activeNodes) {
        const dist = Math.sqrt(Math.pow(active.x - node.x, 2) + Math.pow(active.y - node.y, 2))
        if (dist < 60) {
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(active.x, active.y)
          ctx.strokeStyle = STRAND_BLUE
          ctx.globalAlpha = node.life * 0.2 * (1 - dist / 60)
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACK ORBITS WITH ELEKTRON NODES
    // ═══════════════════════════════════════════════════════════════

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.2 : 1

      const trackRadius = 30 + trackIndex * 25
      const stepAngle = (Math.PI * 2) / pattern.length

      // Draw orbit arc
      ctx.beginPath()
      ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2)
      ctx.strokeStyle = CREAM
      ctx.globalAlpha = baseOpacity * 0.08
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.stroke()
      ctx.setLineDash([])

      // Draw steps as Elektron-style nodes
      pattern.forEach((isHit, stepIndex) => {
        const isCurrent = stepIndex === track.currentStep
        const angle = stepAngle * stepIndex - Math.PI / 2 + time * 0.05 * track.clockDivider

        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        // Check mouse proximity
        const distToMouse = Math.sqrt(Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2))
        const isNearMouse = isHovering && distToMouse < 25

        let size = 4
        if (isCurrent && !track.muted) {
          size += track.currentValue * 4
        }

        ctx.globalAlpha = baseOpacity
        drawGridNode(ctx, x, y, size, isHit, isCurrent || isNearMouse, time)

        // Current step indicator line
        if (isCurrent && isHit && !track.muted) {
          ctx.globalAlpha = baseOpacity * track.currentValue * 0.5
          ctx.strokeStyle = CREAM
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(x, y)
          ctx.stroke()
        }
      })

      // Track label
      ctx.globalAlpha = baseOpacity * 0.4
      ctx.fillStyle = CREAM
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`T${trackIndex + 1}`, centerX - trackRadius - 8, centerY + 3)
    })

    // ═══════════════════════════════════════════════════════════════
    // BB POD CORE
    // ═══════════════════════════════════════════════════════════════
    const coreSize = 15 + totalPulse * 10 + mouseInfluence * 5
    drawBBCore(ctx, centerX, centerY, coreSize, totalPulse, time)

    // Mouse cursor strand to core when hovering
    if (isHovering && mouseDist > 30) {
      drawStrand(ctx, centerX, centerY, mousePos.x, mousePos.y, time, mouseInfluence * 0.4)
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA READOUT (Elektron style)
    // ═══════════════════════════════════════════════════════════════
    ctx.globalAlpha = 0.4
    ctx.fillStyle = CREAM
    ctx.font = '8px monospace'
    ctx.textAlign = 'left'

    const activeCount = tracks.filter(t => !t.muted).length
    const totalHits = tracks.reduce((sum, t) => {
      const p = getPattern(t.id)
      return sum + p.filter(Boolean).length
    }, 0)

    ctx.fillText(`TRK ${activeCount}/${tracks.length}`, 8, 14)
    ctx.fillText(`HIT ${String(totalHits).padStart(2, '0')}`, 8, 24)
    ctx.fillText(`PLS ${(totalPulse * 100).toFixed(0).padStart(3, '0')}`, 8, 34)

    ctx.textAlign = 'right'
    ctx.fillText(`${width}×${height}`, width - 8, 14)

    ctx.globalAlpha = 1
  }, [tracks, getPattern, width, height, mousePos, isHovering, clickRipples])

  useEffect(() => {
    let animationId: number
    const loop = (timestamp: number) => {
      draw(timestamp)
      animationId = requestAnimationFrame(loop)
    }
    animationId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationId)
  }, [draw])

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
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  )
}
