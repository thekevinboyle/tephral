import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'

export function SlicerWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isHolding, setIsHolding] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [holdSlice, setHoldSlice] = useState<number | null>(null)
  const loopAnimationRef = useRef<number | null>(null)
  const loopStartTimeRef = useRef<number>(0)
  const dragStartX = useRef<number | null>(null)

  // Get state from stores
  const sliceCount = useSlicerStore((state) => state.sliceCount)
  const currentSlice = useSlicerStore((state) => state.currentSlice)
  const setCurrentSlice = useSlicerStore((state) => state.setCurrentSlice)
  const captureState = useSlicerStore((state) => state.captureState)
  const playheadPosition = useSlicerStore((state) => state.playheadPosition)
  const setPlayheadPosition = useSlicerStore((state) => state.setPlayheadPosition)
  const isPlaying = useSlicerStore((state) => state.isPlaying)
  const enabled = useSlicerStore((state) => state.enabled)

  // Subscribe to the actual frame arrays, not just the getter
  const frames = useSlicerBufferStore((state) => state.frames)
  const capturedFrames = useSlicerBufferStore((state) => state.capturedFrames)
  const getGrainFrame = useSlicerBufferStore((state) => state.getGrainFrame)
  const setCurrentOutputFrame = useSlicerBufferStore((state) => state.setCurrentOutputFrame)

  // Get active frames based on state
  const activeFrames = capturedFrames !== null ? capturedFrames : frames

  // Calculate waveform data from frames (luminance values)
  const waveformData = useMemo(() => {
    if (activeFrames.length === 0) return []

    // Sample frames to avoid performance issues with many frames
    const maxSamples = 100
    const step = Math.max(1, Math.floor(activeFrames.length / maxSamples))
    const sampledFrames = activeFrames.filter((_, i) => i % step === 0)

    return sampledFrames.map((frame) => {
      const { data, width, height } = frame
      let totalLuminance = 0
      const pixelCount = width * height

      // Sample pixels for performance (every 16th pixel)
      for (let i = 0; i < data.length; i += 64) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }

      // Return average luminance for this frame
      return totalLuminance / (pixelCount / 16)
    })
  }, [activeFrames])

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

    // Draw playhead if playing or interacting
    if ((isPlaying && enabled) || isDragging || isHolding) {
      const sliceStartX = currentSlice * sliceWidth
      const playheadX = sliceStartX + playheadPosition * sliceWidth

      // Playhead line
      ctx.strokeStyle = isDragging ? '#FF6B6B' : '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()

      // Playhead glow
      ctx.strokeStyle = isDragging ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }

    // Draw state badge if frozen or imported
    if (captureState === 'frozen' || captureState === 'imported') {
      const text = captureState === 'imported' ? 'IMPORTED' : 'FROZEN'
      const badgeColor = captureState === 'imported' ? '#8b5cf680' : '#f8717180'
      ctx.font = '10px monospace'
      const textMetrics = ctx.measureText(text)
      const padding = 4
      const badgeWidth = textMetrics.width + padding * 2
      const badgeHeight = 14
      const badgeX = width - badgeWidth - 4
      const badgeY = 4

      // Badge background
      ctx.fillStyle = badgeColor
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight)

      // Badge text
      ctx.fillStyle = 'white'
      ctx.fillText(text, badgeX + padding, badgeY + 10)
    }
  }, [waveformData, sliceCount, currentSlice, captureState, playheadPosition, isPlaying, enabled, isDragging, isHolding])

  // Effect to draw on canvas - animate when playing or interacting
  useEffect(() => {
    if ((isPlaying && enabled) || isDragging || isHolding) {
      // Continuous animation loop when playing or interacting
      let frameId: number
      const animate = () => {
        draw()
        frameId = requestAnimationFrame(animate)
      }
      frameId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameId)
    } else {
      // Single draw when not playing
      draw()
    }
  }, [draw, isPlaying, enabled, isDragging, isHolding])

  // Calculate slice from mouse position
  const getSliceFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const relativeX = x / rect.width

    const clickedSlice = Math.floor(relativeX * sliceCount)
    return Math.max(0, Math.min(sliceCount - 1, clickedSlice))
  }, [sliceCount])

  // Get absolute position (0-1) from mouse event
  const getPositionFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  // Loop animation for hold
  const loopDuration = 500 // ms per loop cycle

  useEffect(() => {
    if (isHolding && holdSlice !== null && enabled) {
      loopStartTimeRef.current = performance.now()

      const loopAnimation = (timestamp: number) => {
        const elapsed = timestamp - loopStartTimeRef.current
        const position = (elapsed % loopDuration) / loopDuration

        // Update playhead and output frame
        setPlayheadPosition(position)
        const frame = getGrainFrame(holdSlice, sliceCount, position)
        if (frame) {
          setCurrentOutputFrame(frame)
        }

        loopAnimationRef.current = requestAnimationFrame(loopAnimation)
      }

      loopAnimationRef.current = requestAnimationFrame(loopAnimation)

      return () => {
        if (loopAnimationRef.current) {
          cancelAnimationFrame(loopAnimationRef.current)
        }
      }
    }
  }, [isHolding, holdSlice, enabled, sliceCount, setPlayheadPosition, getGrainFrame, setCurrentOutputFrame])

  // Handle mouse down - start dragging/scrubbing
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const slice = getSliceFromEvent(e)
    const position = getPositionFromEvent(e)

    if (slice !== null && position !== null) {
      dragStartX.current = e.clientX
      setCurrentSlice(slice)
      setIsDragging(true)

      // Immediately output frame at click position
      if (activeFrames.length > 0) {
        const frameIndex = Math.floor(position * (activeFrames.length - 1))
        const frame = activeFrames[frameIndex]
        if (frame) {
          setCurrentOutputFrame(frame)
          // Update playhead to show position within current slice
          const slicePosition = (position * sliceCount) % 1
          setPlayheadPosition(slicePosition)
        }
      }
    }
  }, [getSliceFromEvent, getPositionFromEvent, setCurrentSlice, activeFrames, sliceCount, setCurrentOutputFrame, setPlayheadPosition])

  // Handle mouse move - scrub through waveform when dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const position = getPositionFromEvent(e)
    const slice = getSliceFromEvent(e)

    if (position !== null && slice !== null && activeFrames.length > 0) {
      // Update current slice if we've moved to a different one
      setCurrentSlice(slice)

      // Get frame at absolute position
      const frameIndex = Math.floor(position * (activeFrames.length - 1))
      const frame = activeFrames[frameIndex]
      if (frame) {
        setCurrentOutputFrame(frame)
        // Update playhead position within slice
        const slicePosition = (position * sliceCount) % 1
        setPlayheadPosition(slicePosition)
      }
    }
  }, [isDragging, getPositionFromEvent, getSliceFromEvent, activeFrames, sliceCount, setCurrentSlice, setCurrentOutputFrame, setPlayheadPosition])

  // Handle mouse up - stop dragging, optionally start looping
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const startX = dragStartX.current
    const didDrag = startX !== null && Math.abs(e.clientX - startX) > 5

    if (!didDrag) {
      // Didn't drag much - start looping on this slice
      const slice = getSliceFromEvent(e)
      if (slice !== null) {
        setHoldSlice(slice)
        setIsHolding(true)
      }
    }

    setIsDragging(false)
    dragStartX.current = null
  }, [getSliceFromEvent])

  // Handle mouse up outside canvas
  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsHolding(false)
    setHoldSlice(null)
    dragStartX.current = null
    if (loopAnimationRef.current) {
      cancelAnimationFrame(loopAnimationRef.current)
    }
  }, [])

  // Handle mouse leave - stop if mouse leaves canvas
  const handleMouseLeave = useCallback(() => {
    if (isDragging || isHolding) {
      setIsDragging(false)
      setIsHolding(false)
      setHoldSlice(null)
      dragStartX.current = null
      if (loopAnimationRef.current) {
        cancelAnimationFrame(loopAnimationRef.current)
      }
    }
  }, [isDragging, isHolding])

  // Global mouse up listener for when mouse is released outside canvas
  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleGlobalMouseUp])

  return (
    <div className="w-full h-full p-2">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded"
        style={{ backgroundColor: 'var(--bg-elevated)', cursor: isDragging ? 'grabbing' : 'pointer' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
