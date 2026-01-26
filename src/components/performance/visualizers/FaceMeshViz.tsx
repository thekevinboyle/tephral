import { useEffect, useRef } from 'react'

interface FaceMeshVizProps {
  confidence: number
  color: string
}

export function FaceMeshViz({ confidence, color }: FaceMeshVizProps) {
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

      const cx = w / 2
      const cy = h / 2 + 2

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.globalAlpha = confidence / 100

      // Simplified face outline
      ctx.beginPath()
      // Face oval
      ctx.ellipse(cx, cy, 12, 10, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Eyes
      const eyeY = cy - 2
      const eyeSpacing = 5
      const blinkPhase = Math.sin(t * 2)
      const eyeHeight = blinkPhase > 0.9 ? 0.5 : 2

      ctx.beginPath()
      ctx.ellipse(cx - eyeSpacing, eyeY, 2, eyeHeight, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + eyeSpacing, eyeY, 2, eyeHeight, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Nose
      ctx.beginPath()
      ctx.moveTo(cx, eyeY + 2)
      ctx.lineTo(cx - 1, cy + 2)
      ctx.lineTo(cx + 1, cy + 2)
      ctx.stroke()

      // Mouth
      const mouthOpen = Math.sin(t) * 0.5 + 0.5
      ctx.beginPath()
      ctx.ellipse(cx, cy + 5, 4, 1 + mouthOpen, 0, 0, Math.PI)
      ctx.stroke()

      // Tracking points
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 3

      const points = [
        [cx - eyeSpacing, eyeY],
        [cx + eyeSpacing, eyeY],
        [cx, cy + 2],
        [cx, cy + 5],
        [cx - 10, cy],
        [cx + 10, cy],
      ]

      points.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [confidence, color])

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="rounded border border-[#333]"
    />
  )
}
