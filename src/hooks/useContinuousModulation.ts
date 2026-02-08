import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useEuclideanStore } from '../stores/euclideanStore'
import { useRicochetStore } from '../stores/ricochetStore'
import { useModulationStore } from '../stores/modulationStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useSlicerStore } from '../stores/slicerStore'

/**
 * Applies continuous modulation from special sources (euclidean, ricochet, lfo, random, step, envelope)
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
    // ParamIds match those used in ExpandedParameterPanel
    switch (effectId) {
      case 'rgb_split':
        if (paramName === 'amount') glitch.updateRGBSplit({ amount: 1 + value * 1.5 })
        if (paramName === 'redOffsetX') glitch.updateRGBSplit({ redOffsetX: value * 0.1 - 0.05 })
        if (paramName === 'redOffsetY') glitch.updateRGBSplit({ redOffsetY: value * 0.1 - 0.05 })
        break
      case 'block_displace':
        if (paramName === 'blockSize') glitch.updateBlockDisplace({ blockSize: 0.02 + value * 0.13 })
        if (paramName === 'displaceChance') glitch.updateBlockDisplace({ displaceChance: value * 0.3 })
        if (paramName === 'displaceDistance') glitch.updateBlockDisplace({ displaceDistance: value * 0.1 })
        break
      case 'scan_lines':
        if (paramName === 'lineCount') glitch.updateScanLines({ lineCount: 50 + Math.floor(value * 350) })
        if (paramName === 'lineOpacity') glitch.updateScanLines({ lineOpacity: value })
        if (paramName === 'lineFlicker') glitch.updateScanLines({ lineFlicker: value * 0.3 })
        break
      case 'noise':
        if (paramName === 'amount') glitch.updateNoise({ amount: value * 0.5 })
        if (paramName === 'speed') glitch.updateNoise({ speed: 1 + value * 29 })
        break
      case 'pixelate':
        if (paramName === 'pixelSize') glitch.updatePixelate({ pixelSize: 2 + Math.floor(value * 30) })
        break
      case 'edges':
        if (paramName === 'threshold') glitch.updateEdgeDetection({ threshold: 0.1 + value * 0.8 })
        if (paramName === 'mixAmount') glitch.updateEdgeDetection({ mixAmount: value })
        break
      case 'chromatic':
        if (paramName === 'intensity') glitch.updateChromaticAberration({ intensity: value })
        if (paramName === 'radialAmount') glitch.updateChromaticAberration({ radialAmount: value })
        break
      case 'feedback':
        if (paramName === 'decay') glitch.updateFeedbackLoop({ decay: value })
        if (paramName === 'zoom') glitch.updateFeedbackLoop({ zoom: 0.95 + value * 0.1 })
        if (paramName === 'rotation') glitch.updateFeedbackLoop({ rotation: value * 10 - 5 })
        break

      // Acid effects
      case 'acid_dots':
        if (paramName === 'gridSize') acid.updateDotsParams({ gridSize: 8 + Math.floor(value * 24) })
        if (paramName === 'dotScale') acid.updateDotsParams({ dotScale: 0.3 + value * 0.7 })
        if (paramName === 'threshold') acid.updateDotsParams({ threshold: value })
        break
      case 'acid_mirror':
        if (paramName === 'segments') acid.updateMirrorParams({ segments: 2 + Math.floor(value * 10) })
        if (paramName === 'centerX') acid.updateMirrorParams({ centerX: value })
        if (paramName === 'centerY') acid.updateMirrorParams({ centerY: value })
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
        if (paramName === 'bleed') acid.updateLedParams({ bleed: value * 0.5 })
        break
      case 'acid_contour':
        if (paramName === 'levels') acid.updateContourParams({ levels: 2 + Math.floor(value * 14) })
        if (paramName === 'lineWidth') acid.updateContourParams({ lineWidth: 1 + value * 3 })
        break
      case 'acid_cloud':
        if (paramName === 'density') acid.updateCloudParams({ density: 1000 + Math.floor(value * 9000) })
        if (paramName === 'depthScale') acid.updateCloudParams({ depthScale: 0.5 + value * 1.5 })
        break
      case 'acid_voronoi':
        if (paramName === 'cellCount') acid.updateVoronoiParams({ cellCount: 20 + Math.floor(value * 180) })
        break

      // Slicer
      case 'slicer':
        if (paramName === 'grainSize') slicer.updateGrainParams({ grainSize: 10 + value * 490 })
        if (paramName === 'scanPosition') slicer.setScanPosition(value)
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
    const modState = useModulationStore.getState()

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

    // LFO routings
    const lfoRoutings = currentRoutings.filter(r => r.trackId === 'lfo')
    if (lfoRoutings.length > 0 && modState.lfo.enabled) {
      for (const routing of lfoRoutings) {
        const modulatedValue = modState.lfo.currentValue * routing.depth
        applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
      }
    }

    // Random routings
    const randomRoutings = currentRoutings.filter(r => r.trackId === 'random')
    if (randomRoutings.length > 0 && modState.random.enabled) {
      for (const routing of randomRoutings) {
        const modulatedValue = modState.random.currentValue * routing.depth
        applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
      }
    }

    // Step routings
    const stepRoutings = currentRoutings.filter(r => r.trackId === 'step')
    if (stepRoutings.length > 0 && modState.step.enabled) {
      for (const routing of stepRoutings) {
        const modulatedValue = modState.step.currentValue * routing.depth
        applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
      }
    }

    // Envelope routings
    const envRoutings = currentRoutings.filter(r => r.trackId === 'envelope')
    if (envRoutings.length > 0 && modState.envelope.enabled) {
      for (const routing of envRoutings) {
        const modulatedValue = modState.envelope.currentValue * routing.depth
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
