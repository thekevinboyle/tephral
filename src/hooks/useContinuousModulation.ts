import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useEuclideanStore } from '../stores/euclideanStore'
import { useRicochetStore } from '../stores/ricochetStore'
import { useModulationStore } from '../stores/modulationStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useSlicerStore } from '../stores/slicerStore'
import { useStrandStore } from '../stores/strandStore'

/**
 * Applies continuous modulation from special sources (euclidean, ricochet, lfo, random, step, envelope)
 * that run independently of the main step sequencer.
 */
export function useContinuousModulation() {
  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()
  const slicer = useSlicerStore()
  const strand = useStrandStore()

  const animationFrameId = useRef<number | null>(null)

  // Apply modulation value to a parameter
  const applyModulation = useCallback((targetParam: string, value: number) => {
    const [effectId, paramName] = targetParam.split('.')

    // Apply to the appropriate store based on effect ID
    // ParamIds match those used in ExpandedParameterPanel
    switch (effectId) {
      // ═══════════════════════════════════════════════════════════════════════
      // GLITCH EFFECTS
      // ═══════════════════════════════════════════════════════════════════════
      case 'rgb_split':
        if (paramName === 'amount') glitch.updateRGBSplit({ amount: 1 + value * 1.5 })
        if (paramName === 'redOffsetX') glitch.updateRGBSplit({ redOffsetX: value * 0.1 - 0.05 })
        if (paramName === 'redOffsetY') glitch.updateRGBSplit({ redOffsetY: value * 0.1 - 0.05 })
        if (paramName === 'greenOffsetX') glitch.updateRGBSplit({ greenOffsetX: value * 0.1 - 0.05 })
        if (paramName === 'greenOffsetY') glitch.updateRGBSplit({ greenOffsetY: value * 0.1 - 0.05 })
        if (paramName === 'blueOffsetX') glitch.updateRGBSplit({ blueOffsetX: value * 0.1 - 0.05 })
        if (paramName === 'blueOffsetY') glitch.updateRGBSplit({ blueOffsetY: value * 0.1 - 0.05 })
        break
      case 'block_displace':
        if (paramName === 'blockSize') glitch.updateBlockDisplace({ blockSize: 0.02 + value * 0.13 })
        if (paramName === 'displaceChance') glitch.updateBlockDisplace({ displaceChance: value * 0.3 })
        if (paramName === 'displaceDistance') glitch.updateBlockDisplace({ displaceDistance: value * 0.1 })
        if (paramName === 'seed') glitch.updateBlockDisplace({ seed: Math.floor(value * 1000) })
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
        if (paramName === 'direction') glitch.updateChromaticAberration({ direction: value * 360 })
        if (paramName === 'redOffset') glitch.updateChromaticAberration({ redOffset: value * 2 - 1 })
        if (paramName === 'blueOffset') glitch.updateChromaticAberration({ blueOffset: value * 2 - 1 })
        break
      case 'vhs':
        if (paramName === 'tearIntensity') glitch.updateVHSTracking({ tearIntensity: value })
        if (paramName === 'tearSpeed') glitch.updateVHSTracking({ tearSpeed: 0.5 + value * 4.5 })
        if (paramName === 'headSwitchNoise') glitch.updateVHSTracking({ headSwitchNoise: value })
        if (paramName === 'colorBleed') glitch.updateVHSTracking({ colorBleed: value })
        if (paramName === 'jitter') glitch.updateVHSTracking({ jitter: value })
        break
      case 'lens':
        if (paramName === 'curvature') glitch.updateLensDistortion({ curvature: value * 2 - 1 })
        if (paramName === 'fresnelRings') glitch.updateLensDistortion({ fresnelRings: Math.floor(value * 10) })
        if (paramName === 'fresnelIntensity') glitch.updateLensDistortion({ fresnelIntensity: value })
        if (paramName === 'fresnelRainbow') glitch.updateLensDistortion({ fresnelRainbow: value })
        if (paramName === 'vignette') glitch.updateLensDistortion({ vignette: value })
        if (paramName === 'vignetteShape') glitch.updateLensDistortion({ vignetteShape: value * 2 })
        if (paramName === 'phosphorGlow') glitch.updateLensDistortion({ phosphorGlow: value })
        break
      case 'dither':
        if (paramName === 'intensity') glitch.updateDither({ intensity: value })
        if (paramName === 'scale') glitch.updateDither({ scale: 1 + Math.floor(value * 7) })
        if (paramName === 'colorDepth') glitch.updateDither({ colorDepth: 2 + Math.floor(value * 14) })
        if (paramName === 'angle') glitch.updateDither({ angle: value * 180 })
        break
      case 'posterize':
        if (paramName === 'levels') glitch.updatePosterize({ levels: 2 + Math.floor(value * 14) })
        if (paramName === 'saturationBoost') glitch.updatePosterize({ saturationBoost: value * 2 })
        if (paramName === 'edgeContrast') glitch.updatePosterize({ edgeContrast: value })
        break
      case 'static_displace':
        if (paramName === 'intensity') glitch.updateStaticDisplacement({ intensity: value })
        if (paramName === 'scale') glitch.updateStaticDisplacement({ scale: 10 + value * 190 })
        if (paramName === 'speed') glitch.updateStaticDisplacement({ speed: value * 5 })
        break
      case 'color_grade':
        if (paramName === 'liftR') glitch.updateColorGrade({ liftR: value * 2 - 1 })
        if (paramName === 'liftG') glitch.updateColorGrade({ liftG: value * 2 - 1 })
        if (paramName === 'liftB') glitch.updateColorGrade({ liftB: value * 2 - 1 })
        if (paramName === 'gammaR') glitch.updateColorGrade({ gammaR: 0.5 + value })
        if (paramName === 'gammaG') glitch.updateColorGrade({ gammaG: 0.5 + value })
        if (paramName === 'gammaB') glitch.updateColorGrade({ gammaB: 0.5 + value })
        if (paramName === 'gainR') glitch.updateColorGrade({ gainR: value * 2 })
        if (paramName === 'gainG') glitch.updateColorGrade({ gainG: value * 2 })
        if (paramName === 'gainB') glitch.updateColorGrade({ gainB: value * 2 })
        if (paramName === 'saturation') glitch.updateColorGrade({ saturation: value * 2 })
        if (paramName === 'contrast') glitch.updateColorGrade({ contrast: 0.5 + value })
        if (paramName === 'brightness') glitch.updateColorGrade({ brightness: value * 2 - 1 })
        if (paramName === 'tintAmount') glitch.updateColorGrade({ tintAmount: value })
        break
      case 'feedback':
        if (paramName === 'decay') glitch.updateFeedbackLoop({ decay: value })
        if (paramName === 'offsetX') glitch.updateFeedbackLoop({ offsetX: value * 0.1 - 0.05 })
        if (paramName === 'offsetY') glitch.updateFeedbackLoop({ offsetY: value * 0.1 - 0.05 })
        if (paramName === 'zoom') glitch.updateFeedbackLoop({ zoom: 0.95 + value * 0.1 })
        if (paramName === 'rotation') glitch.updateFeedbackLoop({ rotation: value * 10 - 5 })
        if (paramName === 'hueShift') glitch.updateFeedbackLoop({ hueShift: value * 360 })
        break

      // ═══════════════════════════════════════════════════════════════════════
      // ACID EFFECTS
      // ═══════════════════════════════════════════════════════════════════════
      case 'acid_dots':
        if (paramName === 'gridSize') acid.updateDotsParams({ gridSize: 8 + Math.floor(value * 24) })
        if (paramName === 'dotScale') acid.updateDotsParams({ dotScale: 0.3 + value * 0.7 })
        if (paramName === 'threshold') acid.updateDotsParams({ threshold: value })
        break
      case 'acid_glyph':
        if (paramName === 'gridSize') acid.updateGlyphParams({ gridSize: 8 + Math.floor(value * 56) })
        if (paramName === 'density') acid.updateGlyphParams({ density: value })
        break
      case 'acid_icons':
        if (paramName === 'gridSize') acid.updateIconsParams({ gridSize: 16 + Math.floor(value * 80) })
        if (paramName === 'rotation') acid.updateIconsParams({ rotation: value * 360 })
        break
      case 'acid_contour':
        if (paramName === 'levels') acid.updateContourParams({ levels: 2 + Math.floor(value * 14) })
        if (paramName === 'lineWidth') acid.updateContourParams({ lineWidth: 1 + value * 3 })
        if (paramName === 'smooth') acid.updateContourParams({ smooth: value })
        break
      case 'acid_decomp':
        if (paramName === 'minBlock') acid.updateDecompParams({ minBlock: 4 + Math.floor(value * 28) })
        if (paramName === 'maxBlock') acid.updateDecompParams({ maxBlock: 16 + Math.floor(value * 112) })
        if (paramName === 'threshold') acid.updateDecompParams({ threshold: value })
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
      case 'acid_thgrid':
        if (paramName === 'threshold') acid.updateThGridParams({ threshold: value })
        if (paramName === 'gridSize') acid.updateThGridParams({ gridSize: 4 + Math.floor(value * 60) })
        if (paramName === 'lineWidth') acid.updateThGridParams({ lineWidth: 1 + value * 4 })
        break
      case 'acid_cloud':
        if (paramName === 'density') acid.updateCloudParams({ density: 1000 + Math.floor(value * 9000) })
        if (paramName === 'depthScale') acid.updateCloudParams({ depthScale: 0.5 + value * 1.5 })
        if (paramName === 'perspective') acid.updateCloudParams({ perspective: value })
        break
      case 'acid_led':
        if (paramName === 'gridSize') acid.updateLedParams({ gridSize: 4 + Math.floor(value * 20) })
        if (paramName === 'dotSize') acid.updateLedParams({ dotSize: 0.3 + value * 0.7 })
        if (paramName === 'brightness') acid.updateLedParams({ brightness: 0.5 + value * 0.5 })
        if (paramName === 'bleed') acid.updateLedParams({ bleed: value * 0.5 })
        break
      case 'acid_slit':
        if (paramName === 'slitPosition') acid.updateSlitParams({ slitPosition: value })
        if (paramName === 'speed') acid.updateSlitParams({ speed: value * 2 })
        if (paramName === 'blend') acid.updateSlitParams({ blend: value })
        break
      case 'acid_voronoi':
        if (paramName === 'cellCount') acid.updateVoronoiParams({ cellCount: 20 + Math.floor(value * 180) })
        break

      // ═══════════════════════════════════════════════════════════════════════
      // STRAND EFFECTS
      // ═══════════════════════════════════════════════════════════════════════
      case 'strand_handprints':
        if (paramName === 'density') strand.updateHandprintsParams({ density: value })
        if (paramName === 'fadeSpeed') strand.updateHandprintsParams({ fadeSpeed: 0.001 + value * 0.049 })
        if (paramName === 'size') strand.updateHandprintsParams({ size: 20 + value * 80 })
        break
      case 'strand_tar':
        if (paramName === 'spreadSpeed') strand.updateTarSpreadParams({ spreadSpeed: 0.001 + value * 0.049 })
        if (paramName === 'threshold') strand.updateTarSpreadParams({ threshold: value })
        if (paramName === 'coverage') strand.updateTarSpreadParams({ coverage: value })
        break
      case 'strand_timefall':
        if (paramName === 'intensity') strand.updateTimefallParams({ intensity: value })
        if (paramName === 'streakCount') strand.updateTimefallParams({ streakCount: 50 + Math.floor(value * 450) })
        if (paramName === 'ageAmount') strand.updateTimefallParams({ ageAmount: value })
        break
      case 'strand_voidout':
        if (paramName === 'speed') strand.updateVoidOutParams({ speed: 0.1 + value * 1.9 })
        if (paramName === 'distortAmount') strand.updateVoidOutParams({ distortAmount: value })
        if (paramName === 'ringWidth') strand.updateVoidOutParams({ ringWidth: 0.01 + value * 0.19 })
        break
      case 'strand_web':
        if (paramName === 'threshold') strand.updateStrandWebParams({ threshold: value })
        if (paramName === 'maxConnections') strand.updateStrandWebParams({ maxConnections: 1 + Math.floor(value * 9) })
        if (paramName === 'glowIntensity') strand.updateStrandWebParams({ glowIntensity: value })
        break
      case 'strand_bridge':
        if (paramName === 'gridSize') strand.updateBridgeLinkParams({ gridSize: 10 + Math.floor(value * 90) })
        if (paramName === 'edgeSensitivity') strand.updateBridgeLinkParams({ edgeSensitivity: value })
        if (paramName === 'opacity') strand.updateBridgeLinkParams({ opacity: value })
        break
      case 'strand_path':
        if (paramName === 'particleCount') strand.updateChiralPathParams({ particleCount: 10 + Math.floor(value * 490) })
        if (paramName === 'trailLength') strand.updateChiralPathParams({ trailLength: 5 + Math.floor(value * 45) })
        if (paramName === 'flowSpeed') strand.updateChiralPathParams({ flowSpeed: 0.5 + value * 4.5 })
        break
      case 'strand_umbilical':
        if (paramName === 'tendrilCount') strand.updateUmbilicalParams({ tendrilCount: 1 + Math.floor(value * 9) })
        if (paramName === 'reachDistance') strand.updateUmbilicalParams({ reachDistance: 50 + value * 250 })
        if (paramName === 'pulseSpeed') strand.updateUmbilicalParams({ pulseSpeed: 0.5 + value * 4.5 })
        break
      case 'strand_odradek':
        if (paramName === 'sweepSpeed') strand.updateOdradekParams({ sweepSpeed: 0.5 + value * 4.5 })
        if (paramName === 'revealDuration') strand.updateOdradekParams({ revealDuration: 0.5 + value * 4.5 })
        if (paramName === 'pingIntensity') strand.updateOdradekParams({ pingIntensity: value })
        break
      case 'strand_chiralium':
        if (paramName === 'threshold') strand.updateChiraliumParams({ threshold: value })
        if (paramName === 'density') strand.updateChiraliumParams({ density: value })
        if (paramName === 'shimmer') strand.updateChiraliumParams({ shimmer: value })
        break
      case 'strand_beach':
        if (paramName === 'grainAmount') strand.updateBeachStaticParams({ grainAmount: value })
        if (paramName === 'invertProbability') strand.updateBeachStaticParams({ invertProbability: value })
        if (paramName === 'flickerSpeed') strand.updateBeachStaticParams({ flickerSpeed: 1 + value * 19 })
        break
      case 'strand_dooms':
        if (paramName === 'haloSize') strand.updateDoomsParams({ haloSize: 0.1 + value * 0.4 })
        if (paramName === 'pulseSpeed') strand.updateDoomsParams({ pulseSpeed: 0.5 + value * 4.5 })
        if (paramName === 'sensitivity') strand.updateDoomsParams({ sensitivity: value })
        break
      case 'strand_cloud':
        if (paramName === 'density') strand.updateChiralCloudParams({ density: value })
        if (paramName === 'responsiveness') strand.updateChiralCloudParams({ responsiveness: value })
        if (paramName === 'tint') strand.updateChiralCloudParams({ tint: value })
        break
      case 'strand_bbpod':
        if (paramName === 'vignetteSize') strand.updateBBPodParams({ vignetteSize: 0.3 + value * 0.5 })
        if (paramName === 'tintStrength') strand.updateBBPodParams({ tintStrength: value })
        if (paramName === 'causticAmount') strand.updateBBPodParams({ causticAmount: value })
        break
      case 'strand_seam':
        if (paramName === 'riftWidth') strand.updateSeamParams({ riftWidth: 0.01 + value * 0.19 })
        if (paramName === 'parallaxAmount') strand.updateSeamParams({ parallaxAmount: value })
        if (paramName === 'edgeDistort') strand.updateSeamParams({ edgeDistort: value })
        break
      case 'strand_extinction':
        if (paramName === 'erosionSpeed') strand.updateExtinctionParams({ erosionSpeed: 0.001 + value * 0.049 })
        if (paramName === 'decayStages') strand.updateExtinctionParams({ decayStages: 2 + Math.floor(value * 8) })
        if (paramName === 'coverage') strand.updateExtinctionParams({ coverage: value })
        break

      // ═══════════════════════════════════════════════════════════════════════
      // SLICER
      // ═══════════════════════════════════════════════════════════════════════
      case 'slicer':
        if (paramName === 'grainSize') slicer.updateGrainParams({ grainSize: 10 + value * 490 })
        if (paramName === 'scanPosition') slicer.setScanPosition(value)
        if (paramName === 'spray') slicer.updateGrainParams({ spray: value })
        if (paramName === 'wet') slicer.setWet(value)
        break
    }
  }, [glitch, acid, slicer, strand])

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
