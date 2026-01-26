import { useEffect, useRef } from 'react'

interface Props {
  amount: number
  redOffsetX: number
}

export function RGBSplitGraphic({ amount, redOffsetX }: Props) {
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
      ctx.fillRect(barWidth - offset, 10, barWidth, h - 20)

      // Green channel
      ctx.fillStyle = '#00ff40'
      ctx.fillRect(barWidth, 10, barWidth, h - 20)

      // Blue channel
      ctx.fillStyle = '#0080ff'
      ctx.fillRect(barWidth + offset, 10, barWidth, h - 20)

      ctx.globalAlpha = 1

      // Waveform at bottom
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < w; x++) {
        const y = h - 15 + Math.sin((x + t * 10) * 0.1) * 5
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [amount, redOffsetX])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
