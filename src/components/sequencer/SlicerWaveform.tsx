import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'

export function SlicerWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get state from stores
  const sliceCount = useSlicerStore((state) => state.sliceCount)
  const currentSlice = useSlicerStore((state) => state.currentSlice)
  const captureState = useSlicerStore((state) => state.captureState)
  const getActiveFrames = useSlicerBufferStore((state) => state.getActiveFrames)

  // Calculate waveform data from frames (luminance values)
  const waveformData = useMemo(() => {
    const frames = getActiveFrames()

    if (frames.length === 0) return []

    return frames.map((frame) => {
      const { data, width, height } = frame
      let totalLuminance = 0
      const pixelCount = width * height

      // Loop through RGBA data (step by 4)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // Calculate luminance and normalize to 0-1
        totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }

      // Return average luminance for this frame
      return totalLuminance / pixelCount
    })
  }, [getActiveFrames])

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle canvas resize to match element size
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    const { width, height } = canvas

    // Clear and fill background
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-elevated') || '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform if we have data
    if (waveformData.length > 0) {
      ctx.fillStyle = '#FF6B6B40' // Slicer color with alpha
      ctx.beginPath()
      ctx.moveTo(0, height)

      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / (waveformData.length - 1)) * width
        const value = waveformData[i]
        const y = height - value * height
        ctx.lineTo(x, y)
      }

      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fill()
    }

    // Draw slice markers
    ctx.strokeStyle = '#FF6B6B'
    ctx.lineWidth = 1
    for (let i = 1; i < sliceCount; i++) {
      const x = (i / sliceCount) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Highlight current slice
    ctx.fillStyle = '#FF6B6B20'
    const sliceWidth = width / sliceCount
    ctx.fillRect(currentSlice * sliceWidth, 0, sliceWidth, height)

    // Draw frozen badge if frozen
    if (captureState === 'frozen') {
      const text = 'FROZEN'
      ctx.font = '10px monospace'
      const textMetrics = ctx.measureText(text)
      const padding = 4
      const badgeWidth = textMetrics.width + padding * 2
      const badgeHeight = 14
      const badgeX = width - badgeWidth - 4
      const badgeY = 4

      // Badge background
      ctx.fillStyle = '#f8717180'
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight)

      // Badge text
      ctx.fillStyle = 'white'
      ctx.fillText(text, badgeX + padding, badgeY + 10)
    }
  }, [waveformData, sliceCount, currentSlice, captureState])

  // Effect to draw on canvas
  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="w-full h-full p-2">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      />
    </div>
  )
}
