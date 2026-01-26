import { useEffect, useRef } from 'react'

interface StippleVizProps {
  size: number
  density: number
  color: string
}

export function StippleViz({ size, density, color }: StippleVizProps) {
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

      const numDots = Math.floor(density * 30)
      const dotSize = Math.max(1, size * 0.4)

      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 2

      for (let i = 0; i < numDots; i++) {
        // Animated positions
        const baseX = (i * 17) % w
        const baseY = (i * 13) % h
        const wobbleX = Math.sin(t + i * 0.5) * 2
        const wobbleY = Math.cos(t * 0.7 + i * 0.3) * 2

        const x = (baseX + wobbleX + w) % w
        const y = (baseY + wobbleY + h) % h

        // Varying opacity based on position
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
      width={80}
      height={24}
      className="rounded border border-[#333]"
    />
  )
}
