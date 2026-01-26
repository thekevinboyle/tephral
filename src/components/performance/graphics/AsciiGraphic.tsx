import { useEffect, useRef } from 'react'

interface Props {
  fontSize: number
  mode: string
  color: string
}

export function AsciiGraphic({ fontSize, mode, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const chars = mode === 'matrix' ? '01' : '@%#*+=-:. '

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const t = frameRef.current * 0.05

      ctx.fillStyle = 'rgba(10, 10, 10, 0.3)'
      ctx.fillRect(0, 0, w, h)

      const size = Math.max(6, fontSize * 0.8)
      ctx.font = `${size}px monospace`
      ctx.fillStyle = color

      const cols = Math.floor(w / (size * 0.6))
      const rows = Math.floor(h / size)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const charIndex = Math.floor((Math.sin(x * 0.3 + y * 0.5 + t) + 1) * 0.5 * chars.length)
          const char = chars[charIndex % chars.length]
          const alpha = mode === 'matrix' ? (Math.random() > 0.8 ? 1 : 0.3) : 0.8
          ctx.globalAlpha = alpha
          ctx.fillText(char, x * size * 0.6, y * size + size)
        }
      }

      ctx.globalAlpha = 1
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [fontSize, mode, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
