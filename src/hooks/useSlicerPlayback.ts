import { useEffect, useRef, useCallback } from 'react'
import { useSlicerStore } from '../stores/slicerStore'
import { useSlicerBufferStore } from '../stores/slicerBufferStore'
import { useSequencerStore } from '../stores/sequencerStore'
import { useMediaStore } from '../stores/mediaStore'

interface ActiveGrain {
  id: number
  startPosition: number  // Global buffer position (0-1) where grain starts
  direction: 1 | -1
  startTime: number
  duration: number       // How long this grain plays (ms)
  rate: number          // Playback rate for this grain
}

const FPS = 30

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
    getFrameAtPosition,
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
    setMaxFrames(Math.floor(bufferSize * FPS))
  }, [bufferSize, setMaxFrames])

  // Auto-scan: automatically sweep scanPosition through the buffer
  // scanPosition is now GLOBAL (0-1 across entire buffer)
  useEffect(() => {
    if (!autoScan || !isPlaying || !enabled) {
      return
    }

    let scanFrameId: number | null = null

    const scanLoop = (timestamp: number) => {
      if (lastScanTime.current === 0) {
        lastScanTime.current = timestamp
      }

      const deltaTime = (timestamp - lastScanTime.current) / 1000
      lastScanTime.current = timestamp

      // Calculate position change based on speed (Hz = full cycles through buffer per second)
      const positionDelta = deltaTime * scanSpeed

      const currentPos = useSlicerStore.getState().scanPosition

      let newPosition: number

      if (scanMode === 'loop') {
        newPosition = (currentPos + positionDelta) % 1
      } else {
        // Pendulum mode
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

  // Frame capture loop
  useEffect(() => {
    if (!videoElement || captureState !== 'live') {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
      return
    }

    if (!captureCanvas.current) {
      captureCanvas.current = document.createElement('canvas')
      captureCanvas.current.width = 480
      captureCanvas.current.height = 270
    }

    const canvas = captureCanvas.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const captureLoop = (timestamp: number) => {
      if (timestamp - lastCaptureTime.current >= 33) {
        lastCaptureTime.current = timestamp
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

  // Spawn a grain at the current scan position
  const spawnGrain = useCallback(() => {
    // Check slice probability
    if (Math.random() > sliceProb) return

    // Get current scan position (now global buffer position 0-1)
    const currentScanPosition = useSlicerStore.getState().scanPosition

    // Apply spray randomization around scan position
    const sprayOffset = (Math.random() - 0.5) * spray
    let startPosition = currentScanPosition + sprayOffset

    // Wrap to keep in valid range
    if (startPosition < 0) startPosition += 1
    if (startPosition > 1) startPosition -= 1

    // Determine direction
    let grainDirection: 1 | -1
    if (direction === 'forward') {
      grainDirection = Math.random() < reverseProb ? -1 : 1
    } else if (direction === 'reverse') {
      grainDirection = Math.random() < reverseProb ? 1 : -1
    } else {
      grainDirection = Math.random() < 0.5 ? 1 : -1
    }

    const newGrain: ActiveGrain = {
      id: grainIdCounter.current++,
      startPosition,
      direction: grainDirection,
      startTime: performance.now(),
      duration: grainSize,
      rate: rate,
    }

    activeGrains.current.push(newGrain)
  }, [sliceProb, spray, direction, reverseProb, grainSize, rate])

  // Main playback loop
  useEffect(() => {
    if (!isPlaying || !enabled) {
      return
    }

    let playbackFrameId: number | null = null
    const bufferDurationMs = bufferSize * 1000

    const playbackLoop = (timestamp: number) => {
      // Calculate trigger interval
      const triggerInterval = syncToBpm
        ? (60000 / bpm) / 4
        : 1000 / triggerRate

      // Check if it's time to trigger new grains
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
      const now = performance.now()
      activeGrains.current = activeGrains.current.filter((grain) => {
        return (now - grain.startTime) < grain.duration
      })

      // Calculate output from active grains
      if (activeGrains.current.length > 0) {
        const grain = activeGrains.current[0]
        const elapsed = now - grain.startTime
        const progress = Math.min(1, elapsed / grain.duration)

        // Calculate how much of the buffer this grain spans during its lifetime
        // At rate=1.0, a 100ms grain reads 100ms of buffer (grainSize/bufferDuration of the buffer)
        // At rate=2.0, it reads 200ms of buffer (double speed scrub)
        const grainBufferSpan = (grain.duration * grain.rate) / bufferDurationMs

        // Calculate current read position
        let currentPosition = grain.startPosition + progress * grainBufferSpan * grain.direction

        // Wrap position to stay in 0-1 range (allows grains to loop through buffer)
        currentPosition = currentPosition % 1
        if (currentPosition < 0) currentPosition += 1

        // Get frame at current position
        const frame = getFrameAtPosition(currentPosition)
        outputFrame.current = frame
        setCurrentOutputFrame(frame)

        // Update playhead visualization
        setPlayheadPosition(currentPosition)

        // Update current slice for visualization (which slice are we in?)
        const visualSlice = Math.floor(currentPosition * sliceCount) % sliceCount
        if (visualSlice !== useSlicerStore.getState().currentSlice) {
          setCurrentSlice(visualSlice)
        }
      } else {
        // No active grains - show frame at current scan position
        const slicerState = useSlicerStore.getState()
        const frame = getFrameAtPosition(slicerState.scanPosition)
        outputFrame.current = frame
        setCurrentOutputFrame(frame)
        setPlayheadPosition(slicerState.scanPosition)
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
    getFrameAtPosition,
    sliceCount,
    setPlayheadPosition,
    setCurrentOutputFrame,
    setCurrentSlice,
    bufferSize,
  ])

  return {
    outputFrame: outputFrame.current,
    activeGrains: activeGrains.current,
  }
}
