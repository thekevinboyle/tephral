import { useEffect, useRef } from 'react'

interface Props {
  confidence: number
  mode: string
  color: string
}

export function FaceMeshGraphic({ confidence, mode, color }: Props) {
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
      const t = frameRef.current * 0.03

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = confidence / 100

      if (mode === 'face_mesh' || mode === 'holistic') {
        // Face oval
        ctx.beginPath()
        ctx.ellipse(cx, cy, 25, 30, 0, 0, Math.PI * 2)
        ctx.stroke()

        // Eyes
        const eyeY = cy - 8
        const blinkPhase = Math.sin(t * 2)
        const eyeHeight = blinkPhase > 0.9 ? 1 : 4

        ctx.beginPath()
        ctx.ellipse(cx - 10, eyeY, 5, eyeHeight, 0, 0, Math.PI * 2)
        ctx.ellipse(cx + 10, eyeY, 5, eyeHeight, 0, 0, Math.PI * 2)
        ctx.stroke()

        // Nose
        ctx.beginPath()
        ctx.moveTo(cx, eyeY + 5)
        ctx.lineTo(cx - 3, cy + 5)
        ctx.lineTo(cx + 3, cy + 5)
        ctx.stroke()

        // Mouth
        const mouthOpen = Math.sin(t) * 0.5 + 0.5
        ctx.beginPath()
        ctx.ellipse(cx, cy + 15, 8, 2 + mouthOpen * 3, 0, 0, Math.PI)
        ctx.stroke()
      }

      if (mode === 'hands' || mode === 'holistic') {
        // Hand outline
        const handX = mode === 'holistic' ? w - 25 : cx
        const handY = mode === 'holistic' ? cy : cy

        ctx.beginPath()
        ctx.arc(handX, handY + 10, 8, 0, Math.PI * 2)
        ctx.stroke()

        // Fingers
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i - 2) * 0.4
          const len = 12 + Math.sin(t + i) * 2
          ctx.beginPath()
          ctx.moveTo(handX, handY + 2)
          ctx.lineTo(handX + Math.cos(angle) * len, handY + 2 + Math.sin(angle) * len)
          ctx.stroke()
        }
      }

      if (mode === 'pose' || mode === 'holistic') {
        // Stick figure
        const poseX = mode === 'holistic' ? 25 : cx
        const poseY = cy

        // Head
        ctx.beginPath()
        ctx.arc(poseX, poseY - 20, 8, 0, Math.PI * 2)
        ctx.stroke()

        // Body
        ctx.beginPath()
        ctx.moveTo(poseX, poseY - 12)
        ctx.lineTo(poseX, poseY + 10)
        ctx.stroke()

        // Arms
        const armSwing = Math.sin(t) * 5
        ctx.beginPath()
        ctx.moveTo(poseX - 15, poseY - 5 + armSwing)
        ctx.lineTo(poseX, poseY - 8)
        ctx.lineTo(poseX + 15, poseY - 5 - armSwing)
        ctx.stroke()

        // Legs
        ctx.beginPath()
        ctx.moveTo(poseX - 10, poseY + 25)
        ctx.lineTo(poseX, poseY + 10)
        ctx.lineTo(poseX + 10, poseY + 25)
        ctx.stroke()
      }

      // Tracking points
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 3

      const trackingPoints = [
        [cx, cy - 20], [cx - 10, cy - 8], [cx + 10, cy - 8],
        [cx, cy + 5], [cx, cy + 15],
      ]

      trackingPoints.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [confidence, mode, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={80}
      className="rounded border border-[#333]"
    />
  )
}
