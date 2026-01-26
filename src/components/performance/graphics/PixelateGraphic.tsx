import { useEffect, useRef } from 'react'

interface Props {
  pixelSize: number
  color: string
}

export function PixelateGraphic({ pixelSize, color }: Props) {
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

      const pSize = Math.max(4, Math.floor(pixelSize / 2))
      const cols = Math.ceil(w / pSize)
      const rows = Math.ceil(h / pSize)

      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const wave = Math.sin((x + t) * 0.5) * Math.cos((y + t * 0.7) * 0.5)
          const brightness = 0.3 + (wave + 1) * 0.35

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`
          ctx.fillRect(x * pSize, y * pSize, pSize - 1, pSize - 1)
        }
      }

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [pixelSize, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
