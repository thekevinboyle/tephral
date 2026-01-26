import { useEffect, useRef } from 'react'

interface WaveformVizProps {
  frequency: number
  amplitude: number
  color: string
}

export function WaveformViz({ frequency, amplitude, color }: WaveformVizProps) {
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
      const t = frameRef.current * 0.05

      // Clear with slight trail effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.3)'
      ctx.fillRect(0, 0, w, h)

      const cy = h / 2
      const amp = (amplitude / 100) * (h / 2 - 2)
      const freq = (frequency / 20) * 0.5

      // Draw oscilloscope line
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.shadowColor = color
      ctx.shadowBlur = 4
      ctx.beginPath()

      for (let x = 0; x < w; x++) {
        const y = cy + Math.sin((x * freq + t) * 0.3) * amp * Math.sin(t * 0.1 + x * 0.05)
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()
      ctx.shadowBlur = 0

      // Center line
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [frequency, amplitude, color])

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="rounded border border-[#333]"
    />
  )
}
