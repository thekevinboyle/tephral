import { useEffect, useRef, useCallback } from 'react'
import { useSlicerStore } from '../stores/slicerStore'
import { useSlicerBufferStore } from '../stores/slicerBufferStore'
import { useSequencerStore } from '../stores/sequencerStore'
import { useMediaStore } from '../stores/mediaStore'

interface ActiveGrain {
  id: number
  sliceIndex: number
  position: number  // 0-1 within slice
  direction: 1 | -1
  startTime: number
  duration: number
}

export function useSlicerPlayback() {
  const {
    enabled,
    isPlaying,
    captureState,
    sliceCount,
    currentSlice,
    sliceSequenceMode,
    grainSize,
    density,
    spray,
    rate,
    direction,
    reverseProb,
    sliceProb,
    syncToBpm,
    triggerRate,
    freeze,
    bufferSize,
    scanPosition,
    autoScan,
    scanSpeed,
    scanMode,
    setCurrentSlice,
    setPlayheadPosition,
    setScanPosition,
  } = useSlicerStore()

  const {
    addFrame,
    setMaxFrames,
    getGrainFrame,
    setCurrentOutputFrame,
  } = useSlicerBufferStore()

  const { bpm } = useSequencerStore()
  const { videoElement } = useMediaStore()

  // Refs for managing state
  const activeGrains = useRef<ActiveGrain[]>([])
  const lastTriggerTime = useRef<number>(0)
  const grainIdCounter = useRef<number>(0)
  const frameId = useRef<number | null>(null)
  const captureCanvas = useRef<HTMLCanvasElement | null>(null)
  const sliceDirection = useRef<1 | -1>(1)
  const outputFrame = useRef<ImageData | null>(null)
  const lastCaptureTime = useRef<number>(0)
  const scanDirection = useRef<1 | -1>(1)
  const lastScanTime = useRef<number>(0)

  // Update maxFrames when bufferSize changes
  useEffect(() => {
    const fps = 30
    setMaxFrames(Math.floor(bufferSize * fps))
  }, [bufferSize, setMaxFrames])

  // Auto-scan: automatically sweep scanPosition through the slice
  useEffect(() => {
    if (!autoScan || !isPlaying || !enabled) {
      return
    }

    let scanFrameId: number | null = null

    const scanLoop = (timestamp: number) => {
      if (lastScanTime.current === 0) {
        lastScanTime.current = timestamp
      }

      const deltaTime = (timestamp - lastScanTime.current) / 1000 // Convert to seconds
      lastScanTime.current = timestamp

      // Calculate position change based on speed (Hz = cycles per second)
      const positionDelta = deltaTime * scanSpeed

      // Get current position from store
      const currentPos = useSlicerStore.getState().scanPosition

      let newPosition: number

      if (scanMode === 'loop') {
        // Loop mode: wrap around from 1 to 0
        newPosition = (currentPos + positionDelta) % 1
      } else {
        // Pendulum mode: bounce back at edges
        newPosition = currentPos + positionDelta * scanDirection.current

        if (newPosition >= 1) {
          newPosition = 1
          scanDirection.current = -1
        } else if (newPosition <= 0) {
          newPosition = 0
          scanDirection.current = 1
        }
      }

      setScanPosition(newPosition)
      scanFrameId = requestAnimationFrame(scanLoop)
    }

    scanFrameId = requestAnimationFrame(scanLoop)

    return () => {
      if (scanFrameId !== null) {
        cancelAnimationFrame(scanFrameId)
      }
      lastScanTime.current = 0
    }
  }, [autoScan, isPlaying, enabled, scanSpeed, scanMode, setScanPosition])

  // Frame capture loop (only when videoElement exists and captureState === 'live')
  useEffect(() => {
    if (!videoElement || captureState !== 'live') {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
      return
    }

    // Create capture canvas if needed (480x270 for performance)
    if (!captureCanvas.current) {
      captureCanvas.current = document.createElement('canvas')
      captureCanvas.current.width = 480
      captureCanvas.current.height = 270
    }

    const canvas = captureCanvas.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const captureLoop = (timestamp: number) => {
      // Target ~33ms (30fps)
      if (timestamp - lastCaptureTime.current >= 33) {
        lastCaptureTime.current = timestamp

        // Draw video to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        addFrame(imageData)
      }

      frameId.current = requestAnimationFrame(captureLoop)
    }

    frameId.current = requestAnimationFrame(captureLoop)

    return () => {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
    }
  }, [videoElement, captureState, addFrame])

  // Advance slice based on sequence mode
  const advanceSlice = useCallback(() => {
    let nextSlice: number

    switch (sliceSequenceMode) {
      case 'forward':
        nextSlice = (currentSlice + 1) % sliceCount
        break
      case 'reverse':
        nextSlice = currentSlice === 0 ? sliceCount - 1 : currentSlice - 1
        break
      case 'pendulum':
        nextSlice = currentSlice + sliceDirection.current
        if (nextSlice >= sliceCount - 1) {
          nextSlice = sliceCount - 1
          sliceDirection.current = -1
        } else if (nextSlice <= 0) {
          nextSlice = 0
          sliceDirection.current = 1
        }
        break
      case 'random':
        nextSlice = Math.floor(Math.random() * sliceCount)
        break
      default:
        nextSlice = (currentSlice + 1) % sliceCount
    }

    setCurrentSlice(nextSlice)
  }, [sliceSequenceMode, currentSlice, sliceCount, setCurrentSlice])

  // Spawn a grain
  const spawnGrain = useCallback(() => {
    // Check slice probability
    if (Math.random() > sliceProb) return

    // Calculate position with spray around the user-controlled scan position
    // Spray randomizes grain start positions around scanPosition (like a granular synth)
    const sprayOffset = (Math.random() - 0.5) * spray * 2
    const position = Math.max(0, Math.min(1, scanPosition + sprayOffset))

    // Determine direction based on direction param and reverseProb
    let grainDirection: 1 | -1
    if (direction === 'forward') {
      grainDirection = Math.random() < reverseProb ? -1 : 1
    } else if (direction === 'reverse') {
      grainDirection = Math.random() < reverseProb ? 1 : -1
    } else {
      // random
      grainDirection = Math.random() < 0.5 ? 1 : -1
    }

    const newGrain: ActiveGrain = {
      id: grainIdCounter.current++,
      sliceIndex: currentSlice,
      position,
      direction: grainDirection,
      startTime: performance.now(),
      duration: grainSize,
    }

    activeGrains.current.push(newGrain)
  }, [sliceProb, scanPosition, spray, direction, reverseProb, currentSlice, grainSize])

  // Main playback loop (only when isPlaying && enabled)
  useEffect(() => {
    if (!isPlaying || !enabled) {
      return
    }

    let playbackFrameId: number | null = null

    const playbackLoop = (timestamp: number) => {
      // Calculate trigger interval
      const triggerInterval = syncToBpm
        ? (60000 / bpm) / 4  // Quarter note subdivisions
        : 1000 / triggerRate

      // Check if it's time to trigger
      if (timestamp - lastTriggerTime.current >= triggerInterval) {
        if (!freeze) {
          advanceSlice()
          // Spawn density number of grains
          for (let i = 0; i < density; i++) {
            spawnGrain()
          }
        }
        lastTriggerTime.current = timestamp
      }

      // Filter expired grains
      activeGrains.current = activeGrains.current.filter((grain) => {
        const elapsed = timestamp - grain.startTime
        return elapsed < grain.duration
      })

      // Set outputFrame from first active grain
      if (activeGrains.current.length > 0) {
        const firstGrain = activeGrains.current[0]
        const elapsed = performance.now() - firstGrain.startTime
        const progress = elapsed / firstGrain.duration

        // Update position based on direction, progress, and rate
        // rate=1 is normal, rate=2 is 2x speed, rate=0.5 is half speed
        let currentPosition = firstGrain.position + progress * firstGrain.direction * rate * 0.5
        currentPosition = Math.max(0, Math.min(1, currentPosition))

        const frame = getGrainFrame(firstGrain.sliceIndex, sliceCount, currentPosition)
        outputFrame.current = frame

        // Update store with current output frame for canvas compositor
        setCurrentOutputFrame(frame)

        // Update playhead position for visualization
        setPlayheadPosition(currentPosition)
      } else {
        outputFrame.current = null
        setCurrentOutputFrame(null)
      }

      playbackFrameId = requestAnimationFrame(playbackLoop)
    }

    playbackFrameId = requestAnimationFrame(playbackLoop)

    return () => {
      if (playbackFrameId !== null) {
        cancelAnimationFrame(playbackFrameId)
      }
    }
  }, [
    isPlaying,
    enabled,
    syncToBpm,
    bpm,
    triggerRate,
    freeze,
    advanceSlice,
    density,
    spawnGrain,
    getGrainFrame,
    sliceCount,
    setPlayheadPosition,
    setCurrentOutputFrame,
    rate,
  ])

  return {
    outputFrame: outputFrame.current,
    activeGrains: activeGrains.current,
  }
}
