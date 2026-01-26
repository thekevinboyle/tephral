import { useEffect, useRef } from 'react'

interface Props {
  lineCount: number
  opacity: number
  color: string
}

export function ScanLinesGraphic({ lineCount, opacity, color }: Props) {
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
      const t = frameRef.current * 0.1

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      const numLines = Math.max(6, Math.floor(lineCount / 40))
      const lineSpacing = h / numLines

      ctx.strokeStyle = color
      ctx.lineWidth = 1

      for (let i = 0; i < numLines; i++) {
        const y = (i * lineSpacing + t) % h
        const flicker = Math.random() > 0.95 ? 0.3 : 1
        ctx.globalAlpha = opacity * flicker
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Moving scan beam
      const beamY = (t * 3) % h
      ctx.globalAlpha = 0.8
      ctx.fillStyle = color
      ctx.fillRect(0, beamY - 2, w, 4)

      ctx.globalAlpha = 1
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [lineCount, opacity, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
