import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'

// Resolution to milliseconds per step
const RESOLUTION_MS: Record<string, number> = {
  '1/4': 1,      // quarter note = 1 beat
  '1/8': 0.5,   // eighth note = 0.5 beats
  '1/16': 0.25, // sixteenth = 0.25 beats
  '1/32': 0.125, // thirty-second = 0.125 beats
}

export function useSequencerPlayback() {
  const {
    isPlaying,
    bpm,
    stepResolution,
    gateMode,
    tracks,
    routings,
    advanceStep,
    getCurrentValues,
  } = useSequencerStore()

  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  const lastStepTime = useRef<number>(0)
  const animationFrameId = useRef<number | null>(null)
  const previousValues = useRef<Map<string, number>>(new Map())
  const previousRoutingIds = useRef<Set<string>>(new Set())

  // Calculate ms per step based on BPM and resolution
  const getMsPerStep = useCallback(() => {
    const beatsPerStep = RESOLUTION_MS[stepResolution] || 0.25
    const msPerBeat = 60000 / bpm
    return msPerBeat * beatsPerStep
  }, [bpm, stepResolution])

  // Apply modulation value to a parameter
  const applyModulation = useCallback((targetParam: string, value: number) => {
    const [effectId, paramName] = targetParam.split('.')

    // For hold mode, use previous value if current is 0
    if (gateMode === 'hold' && value === 0) {
      const prev = previousValues.current.get(targetParam)
      if (prev !== undefined) {
        value = prev
      }
    }

    previousValues.current.set(targetParam, value)

    // Apply to the appropriate store based on effect ID
    switch (effectId) {
      case 'rgb_split':
        if (paramName === 'amount') {
          const baseValue = 1 // Base amount
          glitch.updateRGBSplit({ amount: baseValue + value * 1.5 })
        }
        break
      case 'block_displace':
        if (paramName === 'dist') {
          glitch.updateBlockDisplace({ displaceDistance: 0.02 + value * 0.08 })
        }
        break
      case 'scan_lines':
        if (paramName === 'lines') {
          glitch.updateScanLines({ lineCount: 100 + Math.floor(value * 300) })
        }
        break
      case 'noise':
        if (paramName === 'amount') {
          glitch.updateNoise({ amount: value * 0.5 })
        }
        break
      case 'pixelate':
        if (paramName === 'size') {
          glitch.updatePixelate({ pixelSize: 4 + Math.floor(value * 20) })
        }
        break
      case 'edges':
        if (paramName === 'thresh') {
          glitch.updateEdgeDetection({ threshold: 0.3 + value * 0.5 })
        }
        break
      case 'ascii':
        if (paramName === 'size') {
          ascii.updateParams({ fontSize: 8 + Math.floor(value * 8) })
        }
        break
      case 'stipple':
        if (paramName === 'size') {
          stipple.updateParams({ particleSize: 2 + value * 4 })
        }
        break
    }
  }, [gateMode, glitch, ascii, stipple])

  // Main playback loop
  const playbackLoop = useCallback((timestamp: number) => {
    if (!isPlaying) return

    const msPerStep = getMsPerStep()

    if (timestamp - lastStepTime.current >= msPerStep) {
      lastStepTime.current = timestamp

      // Advance all tracks
      advanceStep()

      // Get current modulation values
      const values = getCurrentValues()

      // Apply modulations
      values.forEach((value, targetParam) => {
        applyModulation(targetParam, value)
      })
    }

    animationFrameId.current = requestAnimationFrame(playbackLoop)
  }, [isPlaying, getMsPerStep, advanceStep, getCurrentValues, applyModulation])

  // Track routing removals, clear cached values, and reset params to base
  useEffect(() => {
    const currentRoutingIds = new Set(routings.map(r => r.id))
    const remainingParams = new Set(routings.map(r => r.targetParam))

    // Find params that no longer have routings and reset them
    previousValues.current.forEach((_, param) => {
      if (!remainingParams.has(param)) {
        previousValues.current.delete(param)
        // Reset the parameter to base value (modulation = 0)
        applyModulation(param, 0)
      }
    })

    previousRoutingIds.current = currentRoutingIds
  }, [routings, applyModulation])

  // Start/stop playback
  useEffect(() => {
    if (isPlaying) {
      lastStepTime.current = performance.now()
      animationFrameId.current = requestAnimationFrame(playbackLoop)
    } else {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      // Reset previous values in trigger mode
      if (gateMode === 'trigger') {
        previousValues.current.clear()
      }
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isPlaying, playbackLoop, gateMode])

  return {
    isPlaying,
    msPerStep: getMsPerStep(),
  }
}
