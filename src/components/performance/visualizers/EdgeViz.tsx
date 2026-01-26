import { useEffect, useRef } from 'react'

interface EdgeVizProps {
  threshold: number
  mix: number
  color: string
}

export function EdgeViz({ threshold, mix, color }: EdgeVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const t = frameRef.current * 0.03

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = mix

      // Animated geometric shape with edges
      ctx.beginPath()

      // Rotating square outline
      const cx = w / 2
      const cy = h / 2
      const size = 8 + threshold * 0.05

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.5)

      // Draw edge-detected style shape
      ctx.strokeRect(-size, -size, size * 2, size * 2)

      // Inner detail
      ctx.rotate(Math.PI / 4)
      const innerSize = size * 0.6
      ctx.strokeRect(-innerSize, -innerSize, innerSize * 2, innerSize * 2)

      ctx.restore()

      // Edge detection lines on sides
      const numEdges = 5
      for (let i = 0; i < numEdges; i++) {
        const x = (i / numEdges) * w
        const edgeIntensity = Math.sin(t + i) > (1 - threshold / 50) ? 1 : 0.2
        ctx.globalAlpha = edgeIntensity * mix
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [threshold, mix, color])

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="rounded border border-[#333]"
    />
  )
}
