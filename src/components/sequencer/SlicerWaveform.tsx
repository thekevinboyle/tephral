import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'

export function SlicerWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [loopSlice, setLoopSlice] = useState<number | null>(null)
  const dragStartX = useRef<number | null>(null)
  const dragStartY = useRef<number | null>(null)
  const clickedSliceRef = useRef<number | null>(null) // Store clicked slice immediately
  const holdTimerRef = useRef<number | null>(null)
  const loopAnimationRef = useRef<number | null>(null)
  const loopStartTimeRef = useRef<number>(0)
  const loopSpeedRef = useRef<number>(1) // Speed multiplier: 1 = normal, >1 = faster, <1 = slower

  // Get state from stores
  const sliceCount = useSlicerStore((state) => state.sliceCount)
  const currentSlice = useSlicerStore((state) => state.currentSlice)
  const setCurrentSlice = useSlicerStore((state) => state.setCurrentSlice)
  const captureState = useSlicerStore((state) => state.captureState)
  const playheadPosition = useSlicerStore((state) => state.playheadPosition)
  const setPlayheadPosition = useSlicerStore((state) => state.setPlayheadPosition)
  const isPlaying = useSlicerStore((state) => state.isPlaying)
  const setIsPlaying = useSlicerStore((state) => state.setIsPlaying)
  const enabled = useSlicerStore((state) => state.enabled)
  const setScanPosition = useSlicerStore((state) => state.setScanPosition)

  // Subscribe to the actual frame arrays, not just the getter
  const frames = useSlicerBufferStore((state) => state.frames)
  const capturedFrames = useSlicerBufferStore((state) => state.capturedFrames)
  const setCurrentOutputFrame = useSlicerBufferStore((state) => state.setCurrentOutputFrame)
  const getFrameAtPosition = useSlicerBufferStore((state) => state.getFrameAtPosition)

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

    // Highlight current slice (pulsing yellow when looping)
    const sliceWidth = width / sliceCount
    if (isLooping && loopSlice !== null) {
      // Pulsing highlight for looping slice
      const pulseAlpha = 0.2 + Math.sin(Date.now() / 100) * 0.15
      ctx.fillStyle = `rgba(255, 204, 0, ${pulseAlpha})`
      ctx.fillRect(loopSlice * sliceWidth, 0, sliceWidth, height)
    } else {
      ctx.fillStyle = '#FF6B6B20'
      ctx.fillRect(currentSlice * sliceWidth, 0, sliceWidth, height)
    }

    // Draw playhead if playing, scrubbing, or looping
    // playheadPosition is now global (0-1 across entire buffer)
    if ((isPlaying && enabled) || isDragging || isLooping) {
      const playheadX = playheadPosition * width

      // Playhead line
      ctx.strokeStyle = isDragging ? '#FF6B6B' : isLooping ? '#ffcc00' : '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()

      // Playhead glow
      ctx.strokeStyle = isDragging ? 'rgba(255, 107, 107, 0.4)' : isLooping ? 'rgba(255, 204, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'
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
  }, [waveformData, sliceCount, currentSlice, captureState, playheadPosition, isPlaying, enabled, isDragging, isLooping, loopSlice])

  // Effect to draw on canvas - animate when playing, scrubbing, or looping
  useEffect(() => {
    if ((isPlaying && enabled) || isDragging || isLooping) {
      // Continuous animation loop when playing, scrubbing, or looping
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
  }, [draw, isPlaying, enabled, isDragging, isLooping])

  // Loop animation - plays through slice frames when holding
  const baseLoopDuration = 500 // ms per loop cycle at normal speed
  useEffect(() => {
    if (isLooping && loopSlice !== null && enabled) {
      loopStartTimeRef.current = performance.now()
      let lastPosition = 0

      // Calculate global position range for this slice
      const sliceStart = loopSlice / sliceCount
      const sliceWidth = 1 / sliceCount

      const loopAnimation = (timestamp: number) => {
        const elapsed = timestamp - loopStartTimeRef.current
        // Apply speed multiplier - higher speed = faster loop (shorter effective duration)
        const effectiveDuration = baseLoopDuration / loopSpeedRef.current
        const localPosition = (elapsed % effectiveDuration) / effectiveDuration

        // Detect loop restart for smooth speed changes
        if (localPosition < lastPosition) {
          loopStartTimeRef.current = timestamp
        }
        lastPosition = localPosition

        // Convert to global position within slice
        const globalPosition = sliceStart + localPosition * sliceWidth

        // Update playhead and output frame
        setPlayheadPosition(globalPosition)
        const frame = getFrameAtPosition(globalPosition)
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
  }, [isLooping, loopSlice, enabled, sliceCount, setPlayheadPosition, getFrameAtPosition, setCurrentOutputFrame])

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

  // Handle mouse down - start dragging/scrubbing, set up hold-to-loop timer
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const slice = getSliceFromEvent(e)
    const position = getPositionFromEvent(e)

    if (slice !== null && position !== null) {
      dragStartX.current = e.clientX
      dragStartY.current = e.clientY
      clickedSliceRef.current = slice // Store clicked slice immediately in ref
      setCurrentSlice(slice)
      setIsDragging(true)

      // Immediately output frame at click position (global position 0-1)
      if (activeFrames.length > 0) {
        const frameIndex = Math.floor(position * (activeFrames.length - 1))
        const frame = activeFrames[frameIndex]
        if (frame) {
          setCurrentOutputFrame(frame)
          setPlayheadPosition(position)
        }
      }

      // Start hold timer - if held without dragging, start looping on the clicked slice
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      holdTimerRef.current = window.setTimeout(() => {
        // Use the ref to get the originally clicked slice
        if (clickedSliceRef.current !== null) {
          setIsDragging(false)
          setIsLooping(true)
          setLoopSlice(clickedSliceRef.current)
          setCurrentSlice(clickedSliceRef.current) // Ensure we're on the right slice
          loopSpeedRef.current = 1 // Reset speed when starting loop
        }
      }, 150) // 150ms hold threshold (faster response)
    }
  }, [getSliceFromEvent, getPositionFromEvent, setCurrentSlice, activeFrames, sliceCount, setCurrentOutputFrame, setPlayheadPosition])

  // Handle mouse move - scrub through waveform when dragging, or adjust loop speed when looping
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // If looping, vertical drag adjusts speed (up = faster, down = slower)
    if (isLooping && dragStartY.current !== null) {
      const deltaY = e.clientY - dragStartY.current
      // Map deltaY to speed: -100px = 4x speed, +100px = 0.25x speed
      // Negative deltaY (drag up) = faster, positive (drag down) = slower
      const speedMultiplier = Math.pow(2, -deltaY / 50)
      // Clamp speed between 0.25x and 4x
      loopSpeedRef.current = Math.max(0.25, Math.min(4, speedMultiplier))
      return
    }

    // If moved enough horizontally, cancel the hold timer (user is dragging, not holding)
    if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 5) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      clickedSliceRef.current = null // Clear since we're dragging
    }

    if (!isDragging) return

    const position = getPositionFromEvent(e)
    const slice = getSliceFromEvent(e)

    if (position !== null && slice !== null && activeFrames.length > 0) {
      // Update current slice if we've moved to a different one
      setCurrentSlice(slice)

      // Get frame at global position (0-1)
      const frameIndex = Math.floor(position * (activeFrames.length - 1))
      const frame = activeFrames[frameIndex]
      if (frame) {
        setCurrentOutputFrame(frame)
        setPlayheadPosition(position)
      }
    }
  }, [isDragging, isLooping, getPositionFromEvent, getSliceFromEvent, activeFrames, sliceCount, setCurrentSlice, setCurrentOutputFrame, setPlayheadPosition])

  // Handle mouse up - stop dragging/looping, start playback from slice start (quantized) if clicked
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    // If we were looping, just stop looping (don't trigger playback)
    if (isLooping) {
      setIsLooping(false)
      setLoopSlice(null)
      if (loopAnimationRef.current) {
        cancelAnimationFrame(loopAnimationRef.current)
      }
      setIsDragging(false)
      dragStartX.current = null
      dragStartY.current = null
      clickedSliceRef.current = null
      loopSpeedRef.current = 1 // Reset speed
      return
    }

    const startX = dragStartX.current
    const didDrag = startX !== null && Math.abs(e.clientX - startX) > 5

    if (!didDrag) {
      // Didn't drag much - jump to slice start and start playback (quantized)
      // Use the originally clicked slice from the ref for accuracy
      const slice = clickedSliceRef.current ?? getSliceFromEvent(e)
      if (slice !== null) {
        setCurrentSlice(slice)
        // Set both scanPosition and playhead to start of clicked slice (global position)
        const globalSliceStart = slice / sliceCount
        setScanPosition(globalSliceStart)
        setPlayheadPosition(globalSliceStart)
        setIsPlaying(true) // Start playback
      }
    }

    setIsDragging(false)
    dragStartX.current = null
    dragStartY.current = null
    clickedSliceRef.current = null
  }, [getSliceFromEvent, setCurrentSlice, setPlayheadPosition, setScanPosition, setIsPlaying, isLooping, sliceCount])

  // Handle mouse up outside canvas
  const handleGlobalMouseUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setIsDragging(false)
    setIsLooping(false)
    setLoopSlice(null)
    dragStartX.current = null
    dragStartY.current = null
    clickedSliceRef.current = null
    loopSpeedRef.current = 1 // Reset speed
    if (loopAnimationRef.current) {
      cancelAnimationFrame(loopAnimationRef.current)
    }
  }, [])

  // Handle mouse leave - stop scrubbing/looping if mouse leaves canvas
  const handleMouseLeave = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (isDragging || isLooping) {
      setIsDragging(false)
      setIsLooping(false)
      setLoopSlice(null)
      dragStartX.current = null
      dragStartY.current = null
      clickedSliceRef.current = null
      loopSpeedRef.current = 1 // Reset speed
      if (loopAnimationRef.current) {
        cancelAnimationFrame(loopAnimationRef.current)
      }
    }
  }, [isDragging, isLooping])

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
