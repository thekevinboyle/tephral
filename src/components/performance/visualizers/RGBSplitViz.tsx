import { useEffect, useRef } from 'react'

interface RGBSplitVizProps {
  amount: number
  redOffsetX: number
  color?: string
}

export function RGBSplitViz({ amount, redOffsetX }: RGBSplitVizProps) {
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

      const offset = (Math.abs(redOffsetX) * 500 + amount * 2) * Math.sin(t * 0.5)
      const barWidth = w / 3

      // Red channel
      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#ff0040'
      ctx.fillRect(barWidth - offset, 4, barWidth, h - 8)

      // Green channel
      ctx.fillStyle = '#00ff40'
      ctx.fillRect(barWidth, 4, barWidth, h - 8)

      // Blue channel
      ctx.fillStyle = '#0080ff'
      ctx.fillRect(barWidth + offset, 4, barWidth, h - 8)

      ctx.globalAlpha = 1

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [amount, redOffsetX])

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
