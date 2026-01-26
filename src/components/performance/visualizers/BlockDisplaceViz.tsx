import { useEffect, useRef } from 'react'

interface BlockDisplaceVizProps {
  amount: number
  seed: number
  color: string
}

export function BlockDisplaceViz({ amount, seed, color }: BlockDisplaceVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const cols = 8
    const rows = 3

    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000
      return x - Math.floor(x)
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const t = frameRef.current * 0.03
      const cellW = w / cols
      const cellH = h / rows

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x
          const rand = seededRandom(seed + idx + Math.floor(t))
          const displaceX = (rand - 0.5) * amount * 0.3
          const brightness = 0.3 + rand * 0.7

          ctx.fillStyle = color
          ctx.globalAlpha = brightness
          ctx.fillRect(
            x * cellW + displaceX + 1,
            y * cellH + 1,
            cellW - 2,
            cellH - 2
          )
        }
      }

      ctx.globalAlpha = 1
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [amount, seed, color])

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="rounded border border-[#333]"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
