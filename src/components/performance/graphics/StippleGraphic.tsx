import { useEffect, useRef } from 'react'

interface Props {
  size: number
  density: number
  color: string
}

export function StippleGraphic({ size, density, color }: Props) {
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
      const t = frameRef.current * 0.02

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      const numDots = Math.floor(density * 50)
      const dotSize = Math.max(1, size * 0.5)

      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 3

      for (let i = 0; i < numDots; i++) {
        const baseX = (i * 17) % w
        const baseY = (i * 13) % h
        const wobbleX = Math.sin(t + i * 0.5) * 3
        const wobbleY = Math.cos(t * 0.7 + i * 0.3) * 3

        const x = (baseX + wobbleX + w) % w
        const y = (baseY + wobbleY + h) % h

        const brightness = 0.4 + Math.sin(t + i) * 0.3 + 0.3

        ctx.globalAlpha = brightness
        ctx.beginPath()
        ctx.arc(x, y, dotSize, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [size, density, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
