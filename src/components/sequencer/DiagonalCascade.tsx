import { useRef, useEffect, useCallback, useState } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'

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
}

// Snap to pixel grid
function snap(value: number, gridSize: number): number {
  return Math.floor(value / gridSize) * gridSize
}

// Draw pixelated line (stepped/blocky)
function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pixelSize: number
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / pixelSize

  for (let i = 0; i <= steps; i++) {
    const t = steps > 0 ? i / steps : 0
    const x = snap(x1 + dx * t, pixelSize)
    const y = snap(y1 + dy * t, pixelSize)
    ctx.fillRect(x, y, pixelSize, pixelSize)
  }
}

// Draw pixelated square node
function drawPixelNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  active: boolean,
  highlight: boolean,
  pixelSize: number
) {
  const snappedX = snap(x - size / 2, pixelSize)
  const snappedY = snap(y - size / 2, pixelSize)
  const snappedSize = Math.max(pixelSize, snap(size, pixelSize))

  if (active) {
    // Filled square for active
    ctx.globalAlpha = highlight ? 0.95 : 0.7
    ctx.fillRect(snappedX, snappedY, snappedSize, snappedSize)

    // Highlight border
    if (highlight) {
      ctx.globalAlpha = 1
      // Top and bottom borders
      ctx.fillRect(snappedX - pixelSize, snappedY - pixelSize, snappedSize + pixelSize * 2, pixelSize)
      ctx.fillRect(snappedX - pixelSize, snappedY + snappedSize, snappedSize + pixelSize * 2, pixelSize)
      // Left and right borders
      ctx.fillRect(snappedX - pixelSize, snappedY, pixelSize, snappedSize)
      ctx.fillRect(snappedX + snappedSize, snappedY, pixelSize, snappedSize)
    }
  } else {
    // Cross pattern for inactive
    ctx.globalAlpha = 0.25
    const halfSize = snappedSize / 2
    // Horizontal line
    ctx.fillRect(snappedX, snappedY + halfSize - pixelSize / 2, snappedSize, pixelSize)
    // Vertical line
    ctx.fillRect(snappedX + halfSize - pixelSize / 2, snappedY, pixelSize, snappedSize)
  }
}

// Draw pixelated ring/orbit (octagonal approximation)
function drawPixelRing(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  pixelSize: number,
  dashed: boolean = false
) {
  const segments = 32
  let dashCounter = 0

  for (let i = 0; i < segments; i++) {
    if (dashed && Math.floor(dashCounter / 2) % 2 === 1) {
      dashCounter++
      continue
    }

    const angle1 = (i / segments) * Math.PI * 2
    const angle2 = ((i + 1) / segments) * Math.PI * 2

    const x1 = snap(centerX + Math.cos(angle1) * radius, pixelSize)
    const y1 = snap(centerY + Math.sin(angle1) * radius, pixelSize)
    const x2 = snap(centerX + Math.cos(angle2) * radius, pixelSize)
    const y2 = snap(centerY + Math.sin(angle2) * radius, pixelSize)

    drawPixelLine(ctx, x1, y1, x2, y2, pixelSize)
    dashCounter++
  }
}

// Draw pixelated core
function drawPixelCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pulse: number,
  time: number,
  pixelSize: number
) {
  const snappedX = snap(x, pixelSize)
  const snappedY = snap(y, pixelSize)

  // Outer ring segments
  ctx.globalAlpha = 0.2
  drawPixelRing(ctx, snappedX, snappedY, size + pixelSize * 4, pixelSize, true)

  // Middle ring
  ctx.globalAlpha = 0.15
  drawPixelRing(ctx, snappedX, snappedY, size + pixelSize * 2, pixelSize, false)

  // Rotating segments around core
  ctx.globalAlpha = 0.3 + pulse * 0.3
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time * 0.3
    const segX = snap(snappedX + Math.cos(angle) * (size + pixelSize), pixelSize)
    const segY = snap(snappedY + Math.sin(angle) * (size + pixelSize), pixelSize)
    ctx.fillRect(segX, segY, pixelSize * 2, pixelSize * 2)
  }

  // Core layers (concentric squares)
  const layers = 3
  for (let layer = layers; layer >= 0; layer--) {
    const layerSize = snap(size * (1 - layer * 0.25), pixelSize)
    const layerX = snap(snappedX - layerSize / 2, pixelSize)
    const layerY = snap(snappedY - layerSize / 2, pixelSize)
    ctx.globalAlpha = 0.2 + (layers - layer) * 0.15 + pulse * 0.2
    ctx.fillRect(layerX, layerY, layerSize, layerSize)
  }

  // Heartbeat center
  const heartbeat = Math.pow(Math.sin(time * 2), 8)
  const centerSize = snap(pixelSize * 2 + heartbeat * pulse * pixelSize * 4, pixelSize)
  ctx.globalAlpha = 0.8 + pulse * 0.2
  ctx.fillRect(
    snap(snappedX - centerSize / 2, pixelSize),
    snap(snappedY - centerSize / 2, pixelSize),
    centerSize,
    centerSize
  )
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

    // Spawn pixel nodes on click
    const nodes = strandNodesRef.current
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 1.5 + Math.random() * 1.5
      nodes.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        life: 1,
        maxLife: 1.5 + Math.random() * 1
      })
    }
    if (nodes.length > 50) nodes.splice(0, nodes.length - 50)
  }, [width, height])

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = timestamp / 1000

    // Pixel size for the grid
    const pixelSize = Math.max(2, Math.floor(Math.min(width, height) / 100))

    // Clear with fade (creates trail effect)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.2)'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // Scale factor
    const scale = Math.min(width, height) / 200

    // Total pulse from all tracks
    const totalPulse = tracks.reduce((sum, t) => sum + (t.muted ? 0 : t.currentValue), 0) / Math.max(tracks.length, 1)

    // Set fill style to cream for all drawing
    ctx.fillStyle = CREAM

    // ═══════════════════════════════════════════════════════════════
    // CLICK RIPPLES (pixelated expanding squares)
    // ═══════════════════════════════════════════════════════════════
    const now = performance.now()
    setClickRipples(prev => prev.filter(r => now - r.time < 1200))

    clickRipples.forEach(ripple => {
      const age = (now - ripple.time) / 1000
      const size = snap(age * 120 * scale, pixelSize)
      const opacity = Math.max(0, 1 - age / 1.2)

      ctx.globalAlpha = opacity * 0.4
      const rx = snap(ripple.x - size / 2, pixelSize)
      const ry = snap(ripple.y - size / 2, pixelSize)

      // Draw square outline
      ctx.fillRect(rx, ry, size, pixelSize) // top
      ctx.fillRect(rx, ry + size - pixelSize, size, pixelSize) // bottom
      ctx.fillRect(rx, ry, pixelSize, size) // left
      ctx.fillRect(rx + size - pixelSize, ry, pixelSize, size) // right

      // Inner square
      const innerSize = snap(size * 0.6, pixelSize)
      ctx.globalAlpha = opacity * 0.2
      const irx = snap(ripple.x - innerSize / 2, pixelSize)
      const iry = snap(ripple.y - innerSize / 2, pixelSize)
      ctx.fillRect(irx, iry, innerSize, pixelSize)
      ctx.fillRect(irx, iry + innerSize - pixelSize, innerSize, pixelSize)
      ctx.fillRect(irx, iry, pixelSize, innerSize)
      ctx.fillRect(irx + innerSize - pixelSize, iry, pixelSize, innerSize)
    })

    // ═══════════════════════════════════════════════════════════════
    // TRACK ORBITS AND CONNECTIONS
    // ═══════════════════════════════════════════════════════════════

    const maxRadius = Math.min(width, height) * 0.42
    const minRadius = 25 * scale
    const trackSpacing = tracks.length > 1 ? (maxRadius - minRadius) / (tracks.length - 1) : 0

    // Collect active nodes for connections
    const activeNodes: { x: number; y: number; intensity: number }[] = []

    tracks.forEach((track, trackIndex) => {
      const pattern = getPattern(track.id)
      const baseOpacity = track.muted ? 0.2 : 1
      const trackRadius = minRadius + trackIndex * trackSpacing
      const stepAngle = (Math.PI * 2) / pattern.length

      // Draw pixelated orbit ring
      ctx.globalAlpha = baseOpacity * 0.12
      drawPixelRing(ctx, centerX, centerY, trackRadius, pixelSize, true)

      // Draw steps
      pattern.forEach((isHit, stepIndex) => {
        const isCurrent = stepIndex === track.currentStep
        const angle = stepAngle * stepIndex - Math.PI / 2 + time * 0.05 * track.clockDivider

        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        // Mouse proximity check
        const distToMouse = Math.sqrt(Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2))
        const isNearMouse = isHovering && distToMouse < 30 * scale

        // Node size
        let size = 6 * scale
        if (isCurrent && !track.muted) {
          size += track.currentValue * 8 * scale
        }

        ctx.globalAlpha = baseOpacity
        drawPixelNode(ctx, x, y, size, isHit, isCurrent || isNearMouse, pixelSize)

        // Store active nodes for connections
        if (isHit && !track.muted) {
          activeNodes.push({
            x: snap(x, pixelSize),
            y: snap(y, pixelSize),
            intensity: isCurrent ? 0.5 + track.currentValue * 0.5 : 0.2
          })
        }

        // Current step line to center
        if (isCurrent && isHit && !track.muted) {
          ctx.globalAlpha = baseOpacity * track.currentValue * 0.4
          drawPixelLine(ctx, centerX, centerY, x, y, pixelSize)
        }
      })

      // Track label
      ctx.globalAlpha = baseOpacity * 0.5
      ctx.font = `${Math.round(10 * scale)}px monospace`
      ctx.textAlign = 'right'
      ctx.fillText(`T${trackIndex + 1}`, snap(centerX - trackRadius - 12 * scale, pixelSize), centerY + 4)
    })

    // ═══════════════════════════════════════════════════════════════
    // STRAND CONNECTIONS (pixelated lines between nodes)
    // ═══════════════════════════════════════════════════════════════
    const strandMaxDist = 100 * scale

    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        const a = activeNodes[i]
        const b = activeNodes[j]
        const dist = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))

        if (dist < strandMaxDist && dist > 10) {
          const intensity = (1 - dist / strandMaxDist) * Math.min(a.intensity, b.intensity)
          ctx.globalAlpha = intensity * 0.5
          drawPixelLine(ctx, a.x, a.y, b.x, b.y, pixelSize)
        }
      }

      // Connect to mouse
      if (isHovering) {
        const a = activeNodes[i]
        const dist = Math.sqrt(Math.pow(mousePos.x - a.x, 2) + Math.pow(mousePos.y - a.y, 2))
        if (dist < strandMaxDist * 1.5 && dist > 10) {
          const intensity = (1 - dist / (strandMaxDist * 1.5)) * a.intensity
          ctx.globalAlpha = intensity * 0.35
          drawPixelLine(ctx, a.x, a.y, snap(mousePos.x, pixelSize), snap(mousePos.y, pixelSize), pixelSize)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FLOATING PIXELS (from clicks)
    // ═══════════════════════════════════════════════════════════════
    const nodes = strandNodesRef.current
    const dt = 0.016

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      node.x += node.vx
      node.y += node.vy
      node.vy += 0.03
      node.vx *= 0.98
      node.vy *= 0.98
      node.life -= dt / node.maxLife

      if (node.life <= 0) {
        nodes.splice(i, 1)
        continue
      }

      // Draw pixel
      const size = snap(node.size * node.life * scale, pixelSize)
      ctx.globalAlpha = node.life * 0.7
      ctx.fillRect(snap(node.x, pixelSize), snap(node.y, pixelSize), Math.max(pixelSize, size), Math.max(pixelSize, size))

      // Connect to nearby active nodes
      for (const active of activeNodes) {
        const dist = Math.sqrt(Math.pow(active.x - node.x, 2) + Math.pow(active.y - node.y, 2))
        if (dist < 60 * scale) {
          ctx.globalAlpha = node.life * 0.15 * (1 - dist / (60 * scale))
          drawPixelLine(ctx, snap(node.x, pixelSize), snap(node.y, pixelSize), active.x, active.y, pixelSize)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PIXELATED CORE
    // ═══════════════════════════════════════════════════════════════
    const coreSize = snap((18 + totalPulse * 12) * scale, pixelSize)
    drawPixelCore(ctx, centerX, centerY, coreSize, totalPulse, time, pixelSize)

    // Mouse connection to core
    if (isHovering) {
      const mouseDist = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2))
      if (mouseDist > 30 * scale) {
        const intensity = Math.max(0, 1 - mouseDist / (150 * scale))
        ctx.globalAlpha = intensity * 0.3
        drawPixelLine(ctx, snap(centerX, pixelSize), snap(centerY, pixelSize), snap(mousePos.x, pixelSize), snap(mousePos.y, pixelSize), pixelSize)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA READOUT
    // ═══════════════════════════════════════════════════════════════
    ctx.globalAlpha = 0.6
    ctx.font = `${Math.round(10 * scale)}px monospace`
    ctx.textAlign = 'left'

    const activeCount = tracks.filter(t => !t.muted).length
    const totalHits = tracks.reduce((sum, t) => {
      const p = getPattern(t.id)
      return sum + p.filter(Boolean).length
    }, 0)

    const textY = snap(16 * scale, pixelSize)
    const lineHeight = snap(14 * scale, pixelSize)
    ctx.fillText(`TRK ${activeCount}/${tracks.length}`, 10, textY)
    ctx.fillText(`HIT ${String(totalHits).padStart(2, '0')}`, 10, textY + lineHeight)
    ctx.fillText(`PLS ${(totalPulse * 100).toFixed(0).padStart(3, '0')}`, 10, textY + lineHeight * 2)

    ctx.textAlign = 'right'
    ctx.fillText(`${pixelSize}PX`, width - 10, textY)

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
