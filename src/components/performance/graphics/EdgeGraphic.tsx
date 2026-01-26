import { useEffect, useRef } from 'react'

interface Props {
  threshold: number
  mix: number
  color: string
}

export function EdgeGraphic({ threshold, mix, color }: Props) {
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
      ctx.lineWidth = 2
      ctx.globalAlpha = mix

      const cx = w / 2
      const cy = h / 2
      const size = 20 + threshold * 0.1

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.5)

      // Outer square
      ctx.strokeRect(-size, -size, size * 2, size * 2)

      // Inner rotated square
      ctx.rotate(Math.PI / 4)
      const innerSize = size * 0.6
      ctx.strokeRect(-innerSize, -innerSize, innerSize * 2, innerSize * 2)

      ctx.restore()

      // Edge lines
      ctx.lineWidth = 1
      const numEdges = 8
      for (let i = 0; i < numEdges; i++) {
        const x = (i / numEdges) * w
        const edgeIntensity = Math.sin(t + i) > (1 - threshold / 50) ? 1 : 0.2
        ctx.globalAlpha = edgeIntensity * mix
        ctx.beginPath()
        ctx.moveTo(x, h - 10)
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
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
