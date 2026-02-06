import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useAcidStore } from '../stores/acidStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useStrandStore } from '../stores/strandStore'
import { useSlicerStore } from '../stores/slicerStore'

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
    routings,
    advanceStep,
    getCurrentValues,
  } = useSequencerStore()

  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const strand = useStrandStore()
  const slicer = useSlicerStore()

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

      // ============================================================================
      // ACID Effects
      // ============================================================================
      case 'acid_dots':
        if (paramName === 'gridSize') acid.updateDotsParams({ gridSize: 8 + Math.floor(value * 24) })
        if (paramName === 'dotScale') acid.updateDotsParams({ dotScale: 0.3 + value * 0.7 })
        if (paramName === 'threshold') acid.updateDotsParams({ threshold: value })
        break
      case 'acid_glyph':
        if (paramName === 'gridSize') acid.updateGlyphParams({ gridSize: 6 + Math.floor(value * 18) })
        if (paramName === 'density') acid.updateGlyphParams({ density: value })
        break
      case 'acid_icons':
        if (paramName === 'gridSize') acid.updateIconsParams({ gridSize: 16 + Math.floor(value * 48) })
        if (paramName === 'rotation') acid.updateIconsParams({ rotation: value * 360 })
        break
      case 'acid_contour':
        if (paramName === 'levels') acid.updateContourParams({ levels: 2 + Math.floor(value * 14) })
        if (paramName === 'lineWidth') acid.updateContourParams({ lineWidth: 1 + value * 3 })
        if (paramName === 'smooth') acid.updateContourParams({ smooth: value })
        break
      case 'acid_decomp':
        if (paramName === 'minBlock') acid.updateDecompParams({ minBlock: 2 + Math.floor(value * 14) })
        if (paramName === 'maxBlock') acid.updateDecompParams({ maxBlock: 32 + Math.floor(value * 96) })
        if (paramName === 'threshold') acid.updateDecompParams({ threshold: value * 0.5 })
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
        if (paramName === 'gridSize') acid.updateThGridParams({ gridSize: 4 + Math.floor(value * 28) })
        if (paramName === 'lineWidth') acid.updateThGridParams({ lineWidth: 1 + value * 3 })
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
        if (paramName === 'speed') acid.updateSlitParams({ speed: 0.5 + value * 1.5 })
        if (paramName === 'blend') acid.updateSlitParams({ blend: value })
        break
      case 'acid_voronoi':
        if (paramName === 'cellCount') acid.updateVoronoiParams({ cellCount: 20 + Math.floor(value * 180) })
        break

      // ============================================================================
      // Vision Tracking Effects
      // ============================================================================
      case 'track_bright':
        if (paramName === 'threshold') vision.updateBrightParams({ threshold: Math.floor(value * 255) })
        if (paramName === 'minSize') vision.updateBrightParams({ minSize: 10 + Math.floor(value * 90) })
        if (paramName === 'maxBlobs') vision.updateBrightParams({ maxBlobs: 5 + Math.floor(value * 45) })
        break
      case 'track_edge':
        if (paramName === 'threshold') vision.updateEdgeParams({ threshold: Math.floor(value * 255) })
        if (paramName === 'minSize') vision.updateEdgeParams({ minSize: 10 + Math.floor(value * 90) })
        if (paramName === 'maxBlobs') vision.updateEdgeParams({ maxBlobs: 5 + Math.floor(value * 45) })
        break
      case 'track_color':
        if (paramName === 'threshold') vision.updateColorParams({ threshold: Math.floor(value * 255) })
        if (paramName === 'minSize') vision.updateColorParams({ minSize: 10 + Math.floor(value * 90) })
        if (paramName === 'maxBlobs') vision.updateColorParams({ maxBlobs: 5 + Math.floor(value * 45) })
        if (paramName === 'colorRange') vision.updateColorParams({ colorRange: 0.1 + value * 0.5 })
        break
      case 'track_motion':
        if (paramName === 'threshold') vision.updateMotionParams({ threshold: Math.floor(value * 255) })
        if (paramName === 'minSize') vision.updateMotionParams({ minSize: 10 + Math.floor(value * 90) })
        if (paramName === 'sensitivity') vision.updateMotionParams({ sensitivity: 10 + Math.floor(value * 90) })
        break
      case 'track_face':
        if (paramName === 'threshold') vision.updateFaceParams({ threshold: Math.floor(value * 100) })
        if (paramName === 'minSize') vision.updateFaceParams({ minSize: 20 + Math.floor(value * 80) })
        if (paramName === 'maxBlobs') vision.updateFaceParams({ maxBlobs: 1 + Math.floor(value * 9) })
        break
      case 'track_hands':
        if (paramName === 'threshold') vision.updateHandsParams({ threshold: Math.floor(value * 100) })
        if (paramName === 'minSize') vision.updateHandsParams({ minSize: 10 + Math.floor(value * 40) })
        if (paramName === 'maxBlobs') vision.updateHandsParams({ maxBlobs: 2 + Math.floor(value * 18) })
        break

      // ============================================================================
      // STRAND Effects
      // ============================================================================
      case 'strand_handprints':
        if (paramName === 'density') strand.updateHandprintsParams({ density: 1 + Math.floor(value * 19) })
        if (paramName === 'fadeSpeed') strand.updateHandprintsParams({ fadeSpeed: 0.1 + value * 1.9 })
        if (paramName === 'size') strand.updateHandprintsParams({ size: 0.5 + value * 2.5 })
        break
      case 'strand_tar':
        if (paramName === 'spreadSpeed') strand.updateTarSpreadParams({ spreadSpeed: value })
        if (paramName === 'threshold') strand.updateTarSpreadParams({ threshold: value })
        if (paramName === 'coverage') strand.updateTarSpreadParams({ coverage: value })
        break
      case 'strand_timefall':
        if (paramName === 'intensity') strand.updateTimefallParams({ intensity: value })
        if (paramName === 'streakCount') strand.updateTimefallParams({ streakCount: 10 + Math.floor(value * 490) })
        if (paramName === 'ageAmount') strand.updateTimefallParams({ ageAmount: value })
        break
      case 'strand_voidout':
        if (paramName === 'speed') strand.updateVoidOutParams({ speed: 0.1 + value * 1.9 })
        if (paramName === 'distortAmount') strand.updateVoidOutParams({ distortAmount: value })
        if (paramName === 'ringWidth') strand.updateVoidOutParams({ ringWidth: 0.01 + value * 0.29 })
        break
      case 'strand_web':
        if (paramName === 'threshold') strand.updateStrandWebParams({ threshold: value })
        if (paramName === 'maxConnections') strand.updateStrandWebParams({ maxConnections: 1 + Math.floor(value * 9) })
        if (paramName === 'glowIntensity') strand.updateStrandWebParams({ glowIntensity: value })
        break
      case 'strand_bridge':
        if (paramName === 'gridSize') strand.updateBridgeLinkParams({ gridSize: 8 + Math.floor(value * 56) })
        if (paramName === 'edgeSensitivity') strand.updateBridgeLinkParams({ edgeSensitivity: value })
        if (paramName === 'opacity') strand.updateBridgeLinkParams({ opacity: value })
        break
      case 'strand_path':
        if (paramName === 'particleCount') strand.updateChiralPathParams({ particleCount: 10 + Math.floor(value * 190) })
        if (paramName === 'trailLength') strand.updateChiralPathParams({ trailLength: 5 + Math.floor(value * 45) })
        if (paramName === 'flowSpeed') strand.updateChiralPathParams({ flowSpeed: 0.1 + value * 2.9 })
        break
      case 'strand_umbilical':
        if (paramName === 'tendrilCount') strand.updateUmbilicalParams({ tendrilCount: 2 + Math.floor(value * 10) })
        if (paramName === 'reachDistance') strand.updateUmbilicalParams({ reachDistance: 0.1 + value * 0.9 })
        if (paramName === 'pulseSpeed') strand.updateUmbilicalParams({ pulseSpeed: 0.1 + value * 2.9 })
        break
      case 'strand_odradek':
        if (paramName === 'sweepSpeed') strand.updateOdradekParams({ sweepSpeed: 0.1 + value * 2.9 })
        if (paramName === 'revealDuration') strand.updateOdradekParams({ revealDuration: 0.1 + value * 0.9 })
        if (paramName === 'pingIntensity') strand.updateOdradekParams({ pingIntensity: value })
        break
      case 'strand_chiralium':
        if (paramName === 'threshold') strand.updateChiraliumParams({ threshold: value })
        if (paramName === 'density') strand.updateChiraliumParams({ density: value })
        if (paramName === 'shimmer') strand.updateChiraliumParams({ shimmer: value })
        break
      case 'strand_beach':
        if (paramName === 'grainAmount') strand.updateBeachStaticParams({ grainAmount: value })
        if (paramName === 'invertProbability') strand.updateBeachStaticParams({ invertProbability: value * 0.5 })
        if (paramName === 'flickerSpeed') strand.updateBeachStaticParams({ flickerSpeed: 0.1 + value * 2.9 })
        break
      case 'strand_dooms':
        if (paramName === 'haloSize') strand.updateDoomsParams({ haloSize: 0.1 + value * 0.9 })
        if (paramName === 'pulseSpeed') strand.updateDoomsParams({ pulseSpeed: 0.1 + value * 1.9 })
        if (paramName === 'sensitivity') strand.updateDoomsParams({ sensitivity: value })
        break
      case 'strand_cloud':
        if (paramName === 'density') strand.updateChiralCloudParams({ density: value })
        if (paramName === 'responsiveness') strand.updateChiralCloudParams({ responsiveness: value })
        if (paramName === 'tint') strand.updateChiralCloudParams({ tint: value })
        break
      case 'strand_bbpod':
        if (paramName === 'vignetteSize') strand.updateBBPodParams({ vignetteSize: 0.5 + value * 0.5 })
        if (paramName === 'tintStrength') strand.updateBBPodParams({ tintStrength: value })
        if (paramName === 'causticAmount') strand.updateBBPodParams({ causticAmount: value })
        break
      case 'strand_seam':
        if (paramName === 'riftWidth') strand.updateSeamParams({ riftWidth: 0.01 + value * 0.19 })
        if (paramName === 'parallaxAmount') strand.updateSeamParams({ parallaxAmount: value * 0.5 })
        if (paramName === 'edgeDistort') strand.updateSeamParams({ edgeDistort: value })
        break
      case 'strand_extinction':
        if (paramName === 'erosionSpeed') strand.updateExtinctionParams({ erosionSpeed: 0.1 + value * 0.9 })
        if (paramName === 'decayStages') strand.updateExtinctionParams({ decayStages: 1 + Math.floor(value * 4) })
        if (paramName === 'coverage') strand.updateExtinctionParams({ coverage: value })
        break

      // ============================================================================
      // Slicer Effects
      // ============================================================================
      case 'slicer':
        if (paramName === 'grainSize') slicer.updateGrainParams({ grainSize: 10 + value * 490 })
        if (paramName === 'density') slicer.updateGrainParams({ density: 1 + Math.floor(value * 7) })
        if (paramName === 'scanPosition') slicer.setScanPosition(value)
        if (paramName === 'spray') slicer.updateGrainParams({ spray: value })
        if (paramName === 'jitter') slicer.updateGrainParams({ jitter: value })
        if (paramName === 'rate') slicer.updateGrainParams({ rate: 0.25 + value * 3.75 })
        if (paramName === 'reverseProb') slicer.updateGrainParams({ reverseProb: value })
        if (paramName === 'sliceProb') slicer.setSliceProb(value)
        if (paramName === 'wet') slicer.setWet(value)
        if (paramName === 'sliceIndex') slicer.setCurrentSlice(Math.floor(value * (slicer.sliceCount - 1)))
        break
    }
  }, [gateMode, glitch, ascii, stipple, acid, vision, strand, slicer])

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
