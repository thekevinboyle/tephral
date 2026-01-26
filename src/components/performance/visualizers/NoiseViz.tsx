import { useEffect, useRef } from 'react'

interface NoiseVizProps {
  amount: number
  speed: number
  color: string
}

export function NoiseViz({ amount, speed, color }: NoiseVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const imageData = ctx.createImageData(canvas.width, canvas.height)

    const draw = () => {
      // Parse color to RGB
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random()
        const intensity = noise * amount * 2.55

        imageData.data[i] = Math.min(255, (r * intensity) / 255)
        imageData.data[i + 1] = Math.min(255, (g * intensity) / 255)
        imageData.data[i + 2] = Math.min(255, (b * intensity) / 255)
        imageData.data[i + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [amount, speed, color])

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
