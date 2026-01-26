import { useRef, useEffect, useMemo } from 'react'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'

interface PointNetworkOverlayProps {
  width: number
  height: number
}

// Bezier curve helper
function drawCurvedLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  curveFactor: number
) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1

  // Perpendicular offset for curve
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return

  const offset = len * curveFactor * 0.3
  const perpX = -dy / len * offset
  const perpY = dx / len * offset

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(midX + perpX, midY + perpY, x2, y2)
  ctx.stroke()
}

export function PointNetworkOverlay({ width, height }: PointNetworkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { faces, hands, poses } = useLandmarksStore()
  const { enabled, params } = usePointNetworkStore()

  // Collect all points from landmarks
  const allPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; id: string; visibility?: number }> = []

    faces.forEach(face => {
      // Use subset of face points for cleaner visualization
      const keyIndices = [
        0, 1, 4, 5, 6, 7, 8, 9, 10,  // face outline
        33, 133, 362, 263,           // eye corners
        61, 291,                      // mouth corners
      ]
      keyIndices.forEach(i => {
        if (face.points[i]) {
          points.push({
            x: face.points[i].point.x,
            y: face.points[i].point.y,
            id: face.points[i].id,
            visibility: face.points[i].visibility,
          })
        }
      })
    })

    hands.forEach(hand => {
      hand.points.forEach(lm => {
        points.push({
          x: lm.point.x,
          y: lm.point.y,
          id: lm.id,
        })
      })
    })

    poses.forEach(pose => {
      pose.points.forEach(lm => {
        if ((lm.visibility || 0) > 0.5) {
          points.push({
            x: lm.point.x,
            y: lm.point.y,
            id: lm.id,
            visibility: lm.visibility,
          })
        }
      })
    })

    return points
  }, [faces, hands, poses])

  // Calculate connections based on mode
  const connections = useMemo(() => {
    if (!params.showLines || allPoints.length < 2) return []

    const conns: Array<[number, number]> = []

    if (params.connectionMode === 'nearest') {
      // Connect each point to nearest N neighbors within distance
      allPoints.forEach((p1, i) => {
        const distances: Array<{ idx: number; dist: number }> = []

        allPoints.forEach((p2, j) => {
          if (i === j) return
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
          if (dist <= params.maxDistance) {
            distances.push({ idx: j, dist })
          }
        })

        distances
          .sort((a, b) => a.dist - b.dist)
          .slice(0, params.maxConnections)
          .forEach(({ idx }) => {
            // Avoid duplicate connections
            if (i < idx) {
              conns.push([i, idx])
            }
          })
      })
    } else if (params.connectionMode === 'all') {
      // Connect all points within distance
      allPoints.forEach((p1, i) => {
        allPoints.forEach((p2, j) => {
          if (i >= j) return
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
          if (dist <= params.maxDistance) {
            conns.push([i, j])
          }
        })
      })
    }

    return conns
  }, [allPoints, params.showLines, params.connectionMode, params.maxDistance, params.maxConnections])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const time = performance.now() / 1000

    // Draw lines
    if (params.showLines) {
      connections.forEach(([i, j], idx) => {
        const p1 = allPoints[i]
        const p2 = allPoints[j]

        const x1 = p1.x * width
        const y1 = p1.y * height
        const x2 = p2.x * width
        const y2 = p2.y * height

        // Alternate colors
        ctx.strokeStyle = idx % 2 === 0 ? params.lineColor : params.lineColorSecondary
        ctx.globalAlpha = params.lineOpacity
        ctx.lineWidth = params.lineWidth

        // Animate line opacity
        if (params.animateLines) {
          const phase = (time * params.flowSpeed + idx * 0.1) % 1
          ctx.globalAlpha = params.lineOpacity * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2))
        }

        if (params.lineCurve > 0) {
          drawCurvedLine(ctx, x1, y1, x2, y2, params.lineCurve)
        } else {
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      })
    }

    // Draw points
    if (params.showPoints) {
      allPoints.forEach((point, idx) => {
        const x = point.x * width
        const y = point.y * height

        let radius = params.pointRadius
        if (params.pulsePoints) {
          radius *= 0.8 + 0.4 * Math.sin(time * 2 + idx * 0.5)
        }

        ctx.fillStyle = params.pointColor
        ctx.globalAlpha = params.pointOpacity * (point.visibility || 1)

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw label
        if (params.showLabels) {
          ctx.globalAlpha = 0.7
          ctx.fillStyle = params.labelColor
          ctx.font = `${params.labelFontSize}px monospace`
          ctx.fillText(`${params.labelPrefix}${idx}`, x + radius + 2, y + 3)
        }
      })
    }
  }, [allPoints, connections, enabled, params, width, height])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
