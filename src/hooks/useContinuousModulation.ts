import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useEuclideanStore } from '../stores/euclideanStore'
import { useRicochetStore } from '../stores/ricochetStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useSlicerStore } from '../stores/slicerStore'

/**
 * Applies continuous modulation from special sources (euclidean, ricochet)
 * that run independently of the main step sequencer.
 */
export function useContinuousModulation() {
  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()
  const slicer = useSlicerStore()

  const animationFrameId = useRef<number | null>(null)

  // Apply modulation value to a parameter
  const applyModulation = useCallback((targetParam: string, value: number) => {
    const [effectId, paramName] = targetParam.split('.')

    // Apply to the appropriate store based on effect ID
    switch (effectId) {
      case 'rgb_split':
        if (paramName === 'amount') {
          const baseValue = 1
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

      // Acid effects
      case 'acid_dots':
        if (paramName === 'gridSize') acid.updateDotsParams({ gridSize: 8 + Math.floor(value * 24) })
        if (paramName === 'dotScale') acid.updateDotsParams({ dotScale: 0.3 + value * 0.7 })
        if (paramName === 'threshold') acid.updateDotsParams({ threshold: value })
        break
      case 'acid_mirror':
        if (paramName === 'segments') acid.updateMirrorParams({ segments: 2 + Math.floor(value * 10) })
        if (paramName === 'rotation') acid.updateMirrorParams({ rotation: value * 360 })
        break
      case 'acid_slice':
        if (paramName === 'sliceCount') acid.updateSliceParams({ sliceCount: 5 + Math.floor(value * 45) })
        if (paramName === 'offset') acid.updateSliceParams({ offset: value })
        break
      case 'acid_led':
        if (paramName === 'gridSize') acid.updateLedParams({ gridSize: 4 + Math.floor(value * 20) })
        if (paramName === 'dotSize') acid.updateLedParams({ dotSize: 0.3 + value * 0.7 })
        if (paramName === 'brightness') acid.updateLedParams({ brightness: 0.5 + value * 0.5 })
        break

      // Slicer
      case 'slicer':
        if (paramName === 'grainSize') slicer.updateGrainParams({ grainSize: 10 + value * 490 })
        if (paramName === 'spray') slicer.updateGrainParams({ spray: value })
        if (paramName === 'wet') slicer.setWet(value)
        break
    }
  }, [glitch, acid, slicer])

  // Continuous modulation loop - reads fresh values from stores each frame
  const modulationLoop = useCallback(() => {
    const currentRoutings = useSequencerStore.getState().routings
    const euclideanState = useEuclideanStore.getState()
    const ricochetState = useRicochetStore.getState()

    // Get euclidean routings
    const euclideanRoutings = currentRoutings.filter(r => r.trackId === 'euclidean')

    if (euclideanRoutings.length > 0 && euclideanState.enabled) {
      for (const routing of euclideanRoutings) {
        const modulatedValue = euclideanState.currentValue * routing.depth
        applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
      }
    }

    // Get ricochet routings
    const ricochetRoutings = currentRoutings.filter(r => r.trackId === 'ricochet')

    if (ricochetRoutings.length > 0 && ricochetState.enabled) {
      for (const routing of ricochetRoutings) {
        const modulatedValue = ricochetState.currentValue * routing.depth
        applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
      }
    }

    animationFrameId.current = requestAnimationFrame(modulationLoop)
  }, [applyModulation])

  // Always run modulation loop - it checks for routings internally
  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(modulationLoop)

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }
  }, [modulationLoop])
}
