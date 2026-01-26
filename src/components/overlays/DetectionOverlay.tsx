import { useRef, useEffect, useMemo } from 'react'
import { useDetectionStore } from '../../stores/detectionStore'
import { useDetectionOverlayStore } from '../../stores/detectionOverlayStore'
import { useMediaStore } from '../../stores/mediaStore'
import { calculateVideoArea } from '../../utils/videoArea'

interface DetectionOverlayProps {
  width: number
  height: number
}

export function DetectionOverlay({ width, height }: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { detections } = useDetectionStore()
  const { enabled, params } = useDetectionOverlayStore()
  const { videoElement, imageElement } = useMediaStore()

  // Calculate video display area
  const videoArea = useMemo(() => {
    const videoWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
    const videoHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height
    return calculateVideoArea(width, height, videoWidth, videoHeight)
  }, [width, height, videoElement, imageElement])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const time = performance.now() / 1000
    const { displayWidth, displayHeight, offsetX, offsetY } = videoArea

    detections.forEach((detection, idx) => {
      // Map normalized coordinates to video display area
      const x = offsetX + detection.bbox.x * displayWidth
      const y = offsetY + detection.bbox.y * displayHeight
      const w = detection.bbox.width * displayWidth
      const h = detection.bbox.height * displayHeight

      // Calculate pulse if animated
      let opacity = params.boxOpacity
      if (params.animateBoxes) {
        opacity *= 0.7 + 0.3 * Math.sin(time * params.pulseSpeed * Math.PI * 2 + idx)
      }

      // Set box style
      ctx.strokeStyle = params.boxColor
      ctx.globalAlpha = opacity
      ctx.lineWidth = params.boxLineWidth

      if (params.boxStyle === 'dashed') {
        ctx.setLineDash([8, 4])
      } else {
        ctx.setLineDash([])
      }

      // Draw box
      if (params.boxStyle === 'corners') {
        const cornerLen = Math.min(w, h) * 0.2
        // Top-left
        ctx.beginPath()
        ctx.moveTo(x, y + cornerLen)
        ctx.lineTo(x, y)
        ctx.lineTo(x + cornerLen, y)
        ctx.stroke()
        // Top-right
        ctx.beginPath()
        ctx.moveTo(x + w - cornerLen, y)
        ctx.lineTo(x + w, y)
        ctx.lineTo(x + w, y + cornerLen)
        ctx.stroke()
        // Bottom-right
        ctx.beginPath()
        ctx.moveTo(x + w, y + h - cornerLen)
        ctx.lineTo(x + w, y + h)
        ctx.lineTo(x + w - cornerLen, y + h)
        ctx.stroke()
        // Bottom-left
        ctx.beginPath()
        ctx.moveTo(x + cornerLen, y + h)
        ctx.lineTo(x, y + h)
        ctx.lineTo(x, y + h - cornerLen)
        ctx.stroke()
      } else {
        ctx.strokeRect(x, y, w, h)
      }

      // Draw label
      if (params.showLabels) {
        ctx.globalAlpha = 1.0

        let labelText = params.customLabelText || detection.label.toUpperCase()
        if (params.showConfidence) {
          labelText += ` ${(detection.confidence * 100).toFixed(0)}%`
        }

        // Apply glitch effect to label
        if (params.glitchLabels && Math.random() > 0.95) {
          labelText = labelText.split('').map(c =>
            Math.random() > 0.8 ? String.fromCharCode(Math.floor(Math.random() * 26) + 65) : c
          ).join('')
        }

        ctx.font = `bold ${params.labelFontSize}px monospace`
        const textWidth = ctx.measureText(labelText).width
        const padding = 4

        // Label background
        ctx.fillStyle = params.labelBgColor
        ctx.fillRect(x, y - params.labelFontSize - padding * 2, textWidth + padding * 2, params.labelFontSize + padding * 2)

        // Label text
        ctx.fillStyle = params.labelColor
        ctx.fillText(labelText, x + padding, y - padding)
      }
    })
  }, [detections, enabled, params, width, height, videoArea])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
