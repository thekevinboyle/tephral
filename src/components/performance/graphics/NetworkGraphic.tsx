import { useEffect, useRef } from 'react'

interface Props {
  pointRadius: number
  maxDistance: number
  color: string
}

export function NetworkGraphic({ pointRadius, maxDistance, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const pointsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (pointsRef.current.length === 0) {
      for (let i = 0; i < 10; i++) {
        pointsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
        })
      }
    }

    let animationId: number

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const points = pointsRef.current

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      points.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.x = Math.max(0, Math.min(w, p.x))
        p.y = Math.max(0, Math.min(h, p.y))
      })

      const maxDist = maxDistance * 150
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x
          const dy = points[i].y - points[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < maxDist) {
            ctx.globalAlpha = 1 - dist / maxDist
            ctx.beginPath()
            ctx.moveTo(points[i].x, points[i].y)
            ctx.lineTo(points[j].x, points[j].y)
            ctx.stroke()
          }
        }
      }

      ctx.globalAlpha = 1
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 4

      points.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(2, pointRadius * 0.5), 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.shadowBlur = 0
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [pointRadius, maxDistance, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
