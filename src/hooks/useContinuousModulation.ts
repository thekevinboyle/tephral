import { useEffect, useRef } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'
import { useEuclideanStore } from '../stores/euclideanStore'
import { useRicochetStore } from '../stores/ricochetStore'
import { useModulationStore } from '../stores/modulationStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useSlicerStore } from '../stores/slicerStore'
import { useStrandStore } from '../stores/strandStore'
import { usePolyEuclidStore } from '../stores/polyEuclidStore'
import { useMIDIStore } from '../stores/midiStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useTrendStore } from '../stores/trendStore'

/**
 * Applies continuous modulation from special sources (euclidean, ricochet, lfo, random, step, envelope)
 * that run independently of the main step sequencer.
 *
 * Uses getState() to always get fresh store references on each frame.
 */
export function useContinuousModulation() {
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    // Apply modulation value to a parameter - uses getState() for fresh references
    const applyModulation = (targetParam: string, value: number) => {
      const [effectId, paramName] = targetParam.split('.')

      // Get fresh store references
      const glitch = useGlitchEngineStore.getState()
      const acid = useAcidStore.getState()
      const slicer = useSlicerStore.getState()
      const strand = useStrandStore.getState()

      // Handle bypass modulation for any effect (paramName === 'bypass')
      if (paramName === 'bypass') {
        glitch.setEffectBypassed(effectId, value > 0.5)
        return
      }

      // Apply to the appropriate store based on effect ID
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

        // ═══════════════════════════════════════════════════════════════════════
        // ACID EFFECTS (continued — halftone, hex, scan, ripple)
        // ═══════════════════════════════════════════════════════════════════════
        case 'acid_halftone':
          if (paramName === 'dotSize') acid.updateHalftoneParams({ dotSize: 1 + Math.floor(value * 63) })
          if (paramName === 'angle') acid.updateHalftoneParams({ angle: value * 360 })
          if (paramName === 'contrast') acid.updateHalftoneParams({ contrast: value * 2 })
          break
        case 'acid_hex':
          if (paramName === 'cellSize') acid.updateHexParams({ cellSize: 2 + Math.floor(value * 126) })
          if (paramName === 'rotation') acid.updateHexParams({ rotation: value * 360 })
          break
        case 'acid_scan':
          if (paramName === 'speed') acid.updateScanParams({ speed: 0.1 + value * 19.9 })
          if (paramName === 'width') acid.updateScanParams({ width: 1 + Math.floor(value * 99) })
          if (paramName === 'trail') acid.updateScanParams({ trail: value })
          break
        case 'acid_ripple':
          if (paramName === 'frequency') acid.updateRippleParams({ frequency: 0.1 + value * 49.9 })
          if (paramName === 'amplitude') acid.updateRippleParams({ amplitude: value * 100 })
          if (paramName === 'speed') acid.updateRippleParams({ speed: 0.1 + value * 9.9 })
          if (paramName === 'decay') acid.updateRippleParams({ decay: value })
          break

        // ═══════════════════════════════════════════════════════════════════════
        // MOTION EFFECTS
        // ═══════════════════════════════════════════════════════════════════════
        case 'motion_extract': {
          const motionStore = useMotionStore.getState()
          if (paramName === 'threshold') motionStore.updateMotionExtract({ threshold: value })
          if (paramName === 'frameCount') motionStore.updateMotionExtract({ frameCount: 2 + Math.floor(value * 6) })
          if (paramName === 'amplify') motionStore.updateMotionExtract({ amplify: 1 + value * 9 })
          if (paramName === 'originalMix') motionStore.updateMotionExtract({ originalMix: value })
          break
        }
        case 'echo_trail': {
          const motionStore = useMotionStore.getState()
          if (paramName === 'trailCount') motionStore.updateEchoTrail({ trailCount: 2 + Math.floor(value * 14) })
          if (paramName === 'decay') motionStore.updateEchoTrail({ decay: value })
          if (paramName === 'offset') motionStore.updateEchoTrail({ offset: value * 0.1 })
          if (paramName === 'hueAmount') motionStore.updateEchoTrail({ hueAmount: value * 60 })
          break
        }
        case 'time_smear': {
          const motionStore = useMotionStore.getState()
          if (paramName === 'accumulation') motionStore.updateTimeSmear({ accumulation: value })
          if (paramName === 'threshold') motionStore.updateTimeSmear({ threshold: value })
          break
        }
        case 'freeze_mask': {
          const motionStore = useMotionStore.getState()
          if (paramName === 'freezeThreshold') motionStore.updateFreezeMask({ freezeThreshold: value })
          if (paramName === 'updateSpeed') motionStore.updateFreezeMask({ updateSpeed: value })
          break
        }

        // ═══════════════════════════════════════════════════════════════════════
        // DESTRUCTION EFFECTS
        // ═══════════════════════════════════════════════════════════════════════
        case 'datamosh': {
          const dest = useDestructionStore.getState()
          if (paramName === 'intensity') dest.updateDatamoshParams({ intensity: value })
          if (paramName === 'blockSize') dest.updateDatamoshParams({ blockSize: 4 + Math.floor(value * 28) })
          if (paramName === 'keyframeChance') dest.updateDatamoshParams({ keyframeChance: value * 0.1 })
          if (paramName === 'chaos') dest.updateDatamoshParams({ chaos: value })
          if (paramName === 'feedback') dest.updateDatamoshParams({ feedback: value })
          if (paramName === 'mix') dest.updateDatamoshParams({ mix: value })
          break
        }
        case 'pixelSort': {
          const dest = useDestructionStore.getState()
          if (paramName === 'threshold') dest.updatePixelSortParams({ threshold: value })
          if (paramName === 'streakLength') dest.updatePixelSortParams({ streakLength: 1 + Math.floor(value * 499) })
          if (paramName === 'intensity') dest.updatePixelSortParams({ intensity: value })
          if (paramName === 'randomness') dest.updatePixelSortParams({ randomness: value })
          if (paramName === 'mix') dest.updatePixelSortParams({ mix: value })
          break
        }
        case 'sonify': {
          const dest = useDestructionStore.getState()
          if (paramName === 'sampleRate') dest.updateSonifyParams({ sampleRate: 0.01 + value * 0.99 })
          if (paramName === 'bitDepth') dest.updateSonifyParams({ bitDepth: 1 + Math.floor(value * 15) })
          if (paramName === 'drive') dest.updateSonifyParams({ drive: value })
          if (paramName === 'filterCutoff') dest.updateSonifyParams({ filterCutoff: value })
          if (paramName === 'byteOffset') dest.updateSonifyParams({ byteOffset: value })
          if (paramName === 'intensity') dest.updateSonifyParams({ intensity: value })
          if (paramName === 'mix') dest.updateSonifyParams({ mix: value })
          break
        }
        case 'point_cloud': {
          const dest = useDestructionStore.getState()
          if (paramName === 'density') dest.updatePointCloudParams({ density: 64 + Math.floor(value * 448) })
          if (paramName === 'pointSize') dest.updatePointCloudParams({ pointSize: 1 + value * 19 })
          if (paramName === 'depthMultiplier') dest.updatePointCloudParams({ depthMultiplier: value * 2 })
          if (paramName === 'noiseDisplace') dest.updatePointCloudParams({ noiseDisplace: value })
          if (paramName === 'noiseScale') dest.updatePointCloudParams({ noiseScale: 0.1 + value * 9.9 })
          if (paramName === 'noiseSpeed') dest.updatePointCloudParams({ noiseSpeed: value * 2 })
          if (paramName === 'opacity') dest.updatePointCloudParams({ opacity: value })
          if (paramName === 'rotateX') dest.updatePointCloudParams({ rotateX: (value * 2 - 1) * Math.PI })
          if (paramName === 'rotateY') dest.updatePointCloudParams({ rotateY: (value - 0.5) * Math.PI })
          if (paramName === 'zoom') dest.updatePointCloudParams({ zoom: 0.5 + value * 4.5 })
          if (paramName === 'scaleX') dest.updatePointCloudParams({ scaleX: 0.3 + value * 1.7 })
          if (paramName === 'scaleY') dest.updatePointCloudParams({ scaleY: 0.3 + value * 1.7 })
          if (paramName === 'mix') dest.updatePointCloudParams({ mix: value })
          break
        }

        // ═══════════════════════════════════════════════════════════════════════
        // TREND EFFECTS — VISION
        // ═══════════════════════════════════════════════════════════════════════
        case 'halation': {
          const trend = useTrendStore.getState()
          if (paramName === 'threshold') trend.updateHalationParams({ threshold: value })
          if (paramName === 'radius') trend.updateHalationParams({ radius: 4 + Math.floor(value * 60) })
          if (paramName === 'redBias') trend.updateHalationParams({ redBias: value })
          if (paramName === 'amount') trend.updateHalationParams({ amount: value })
          if (paramName === 'mix') trend.updateHalationParams({ mix: value })
          break
        }
        case 'y2k_digicam': {
          const trend = useTrendStore.getState()
          if (paramName === 'flash') trend.updateY2kParams({ flash: value })
          if (paramName === 'vignette') trend.updateY2kParams({ vignette: value })
          if (paramName === 'grain') trend.updateY2kParams({ grain: value })
          if (paramName === 'resDown') trend.updateY2kParams({ resDown: 1 + Math.floor(value * 7) })
          if (paramName === 'mix') trend.updateY2kParams({ mix: value })
          break
        }
        case 'thermal': {
          const trend = useTrendStore.getState()
          if (paramName === 'palette') trend.updateThermalParams({ palette: Math.floor(value * 2.999) })
          if (paramName === 'gain') trend.updateThermalParams({ gain: 0.5 + value * 1.5 })
          if (paramName === 'grain') trend.updateThermalParams({ grain: value })
          if (paramName === 'vignette') trend.updateThermalParams({ vignette: value })
          if (paramName === 'mix') trend.updateThermalParams({ mix: value })
          break
        }
        case 'dreamcore': {
          const trend = useTrendStore.getState()
          if (paramName === 'bloom') trend.updateDreamcoreParams({ bloom: value })
          if (paramName === 'radius') trend.updateDreamcoreParams({ radius: 4 + Math.floor(value * 60) })
          if (paramName === 'pastel') trend.updateDreamcoreParams({ pastel: value })
          if (paramName === 'haze') trend.updateDreamcoreParams({ haze: value })
          if (paramName === 'drift') trend.updateDreamcoreParams({ drift: value * 2 })
          if (paramName === 'mix') trend.updateDreamcoreParams({ mix: value })
          break
        }
        case 'anamorphic': {
          const trend = useTrendStore.getState()
          if (paramName === 'threshold') trend.updateAnamorphicParams({ threshold: value })
          if (paramName === 'streak') trend.updateAnamorphicParams({ streak: value })
          if (paramName === 'tint') trend.updateAnamorphicParams({ tint: value })
          if (paramName === 'squeeze') trend.updateAnamorphicParams({ squeeze: value * 0.3 })
          if (paramName === 'mix') trend.updateAnamorphicParams({ mix: value })
          break
        }

        // ═══════════════════════════════════════════════════════════════════════
        // TREND EFFECTS — MOTION
        // ═══════════════════════════════════════════════════════════════════════
        case 'flow_smear': {
          const trend = useTrendStore.getState()
          if (paramName === 'strength') trend.updateFlowSmearParams({ strength: value * 100 })
          if (paramName === 'decay') trend.updateFlowSmearParams({ decay: value })
          if (paramName === 'blur') trend.updateFlowSmearParams({ blur: value })
          if (paramName === 'structure') trend.updateFlowSmearParams({ structure: value })
          if (paramName === 'mix') trend.updateFlowSmearParams({ mix: value })
          break
        }
        case 'feedback_tunnel': {
          const trend = useTrendStore.getState()
          if (paramName === 'zoom') trend.updateFeedbackTunnelParams({ zoom: 0.9 + value * 0.2 })
          if (paramName === 'rotate') trend.updateFeedbackTunnelParams({ rotate: value * 10 - 5 })
          if (paramName === 'decay') trend.updateFeedbackTunnelParams({ decay: value })
          if (paramName === 'hueShift') trend.updateFeedbackTunnelParams({ hueShift: value * 30 })
          if (paramName === 'mix') trend.updateFeedbackTunnelParams({ mix: value })
          break
        }
        case 'opium_trails': {
          const trend = useTrendStore.getState()
          if (paramName === 'decay') trend.updateOpiumTrailsParams({ decay: value })
          if (paramName === 'crush') trend.updateOpiumTrailsParams({ crush: value })
          if (paramName === 'desat') trend.updateOpiumTrailsParams({ desat: value })
          if (paramName === 'mix') trend.updateOpiumTrailsParams({ mix: value })
          break
        }
        case 'rutt_etra': {
          const trend = useTrendStore.getState()
          if (paramName === 'lines') trend.updateRuttEtraParams({ lines: 16 + Math.floor(value * 112) })
          if (paramName === 'depth') trend.updateRuttEtraParams({ depth: value * 100 })
          if (paramName === 'tilt') trend.updateRuttEtraParams({ tilt: value * 60 })
          if (paramName === 'glow') trend.updateRuttEtraParams({ glow: value })
          if (paramName === 'mix') trend.updateRuttEtraParams({ mix: value })
          break
        }
        case 'reaction_diffusion': {
          const trend = useTrendStore.getState()
          if (paramName === 'feed') trend.updateReactionDiffusionParams({ feed: 0.01 + value * 0.09 })
          if (paramName === 'kill') trend.updateReactionDiffusionParams({ kill: 0.04 + value * 0.03 })
          if (paramName === 'speed') trend.updateReactionDiffusionParams({ speed: 1 + value * 7 })
          if (paramName === 'seedAmt') trend.updateReactionDiffusionParams({ seedAmt: value })
          if (paramName === 'colorize') trend.updateReactionDiffusionParams({ colorize: value })
          if (paramName === 'mix') trend.updateReactionDiffusionParams({ mix: value })
          break
        }
        case 'physarum': {
          const trend = useTrendStore.getState()
          if (paramName === 'agents') trend.updatePhysarumParams({ agents: 10000 + Math.floor(value * 290000) })
          if (paramName === 'sensorAngle') trend.updatePhysarumParams({ sensorAngle: 10 + value * 50 })
          if (paramName === 'sensorDist') trend.updatePhysarumParams({ sensorDist: 4 + value * 28 })
          if (paramName === 'decay') trend.updatePhysarumParams({ decay: 0.8 + value * 0.19 })
          if (paramName === 'deposit') trend.updatePhysarumParams({ deposit: value })
          if (paramName === 'lumaBias') trend.updatePhysarumParams({ lumaBias: value })
          if (paramName === 'mix') trend.updatePhysarumParams({ mix: value })
          break
        }

        // ═══════════════════════════════════════════════════════════════════════
        // TREND EFFECTS — DESTROY
        // ═══════════════════════════════════════════════════════════════════════
        case 'kaleidoscope': {
          const trend = useTrendStore.getState()
          if (paramName === 'segments') trend.updateKaleidoscopeParams({ segments: 2 + Math.floor(value * 14) })
          if (paramName === 'spin') trend.updateKaleidoscopeParams({ spin: value * 4 - 2 })
          if (paramName === 'offset') trend.updateKaleidoscopeParams({ offset: value })
          if (paramName === 'mix') trend.updateKaleidoscopeParams({ mix: value })
          break
        }
        case 'liquid_morph': {
          const trend = useTrendStore.getState()
          if (paramName === 'speed') trend.updateLiquidMorphParams({ speed: 0.1 + value * 2.9 })
          if (paramName === 'scale') trend.updateLiquidMorphParams({ scale: 1 + value * 19 })
          if (paramName === 'intensity') trend.updateLiquidMorphParams({ intensity: value })
          if (paramName === 'chromeAmount') trend.updateLiquidMorphParams({ chromeAmount: value })
          if (paramName === 'mix') trend.updateLiquidMorphParams({ mix: value })
          break
        }
        case 'crystallize': {
          const trend = useTrendStore.getState()
          if (paramName === 'cellCount') trend.updateCrystallizeParams({ cellCount: 8 + Math.floor(value * 120) })
          if (paramName === 'shatter') trend.updateCrystallizeParams({ shatter: value })
          if (paramName === 'edgeGlow') trend.updateCrystallizeParams({ edgeGlow: value })
          if (paramName === 'mix') trend.updateCrystallizeParams({ mix: value })
          break
        }
        case 'ripple_warp': {
          const trend = useTrendStore.getState()
          if (paramName === 'frequency') trend.updateRippleWarpParams({ frequency: 1 + value * 39 })
          if (paramName === 'speed') trend.updateRippleWarpParams({ speed: 0.1 + value * 4.9 })
          if (paramName === 'amplitude') trend.updateRippleWarpParams({ amplitude: value })
          if (paramName === 'decay') trend.updateRippleWarpParams({ decay: value })
          if (paramName === 'mix') trend.updateRippleWarpParams({ mix: value })
          break
        }
        case 'fractal_domain': {
          const trend = useTrendStore.getState()
          if (paramName === 'iterations') trend.updateFractalDomainParams({ iterations: 1 + Math.floor(value * 7) })
          if (paramName === 'zoom') trend.updateFractalDomainParams({ zoom: 1 + value * 2 })
          if (paramName === 'spin') trend.updateFractalDomainParams({ spin: value * 4 - 2 })
          if (paramName === 'mix') trend.updateFractalDomainParams({ mix: value })
          break
        }
      }
    }

    // Continuous modulation loop - reads fresh values from stores each frame
    const modulationLoop = () => {
      const currentRoutings = useSequencerStore.getState().routings
      const euclideanState = useEuclideanStore.getState()
      const ricochetState = useRicochetStore.getState()
      const modState = useModulationStore.getState()

      // Euclidean routings
      const euclideanRoutings = currentRoutings.filter(r => r.trackId === 'euclidean')
      if (euclideanRoutings.length > 0 && euclideanState.enabled) {
        for (const routing of euclideanRoutings) {
          const modulatedValue = euclideanState.currentValue * routing.depth
          applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
        }
      }

      // Ricochet routings
      const ricochetRoutings = currentRoutings.filter(r => r.trackId === 'ricochet')
      if (ricochetRoutings.length > 0 && ricochetState.enabled) {
        for (const routing of ricochetRoutings) {
          const modulatedValue = ricochetState.currentValue * routing.depth
          applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
        }
      }

      // LFO routings (8 independent LFOs)
      for (let i = 0; i < modState.lfos.length; i++) {
        const lfoRoutings = currentRoutings.filter(r => r.trackId === `lfo-${i}`)
        if (lfoRoutings.length > 0 && modState.lfos[i].enabled) {
          for (const routing of lfoRoutings) {
            const modulatedValue = modState.lfos[i].currentValue * routing.depth
            applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
          }
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

      // Sample & Hold routings
      const sampleHoldRoutings = currentRoutings.filter(r => r.trackId === 'sampleHold')
      if (sampleHoldRoutings.length > 0 && modState.sampleHold.enabled) {
        for (const routing of sampleHoldRoutings) {
          const modulatedValue = modState.sampleHold.currentValue * routing.depth
          applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
        }
      }

      // PolyEuclid routings
      const polyEuclidState = usePolyEuclidStore.getState()
      for (const track of polyEuclidState.tracks) {
        if (track.muted) continue
        const trackRoutings = currentRoutings.filter(r => r.trackId === `polyEuclid-${track.id}`)
        for (const routing of trackRoutings) {
          const modulatedValue = track.currentValue * routing.depth
          applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
        }
      }

      // MIDI CC routings
      const midiState = useMIDIStore.getState()
      const midiCCRoutings = currentRoutings.filter(r => r.trackId.startsWith('midi-cc-'))
      if (midiCCRoutings.length > 0) {
        for (const routing of midiCCRoutings) {
          const ccNumber = parseInt(routing.trackId.split('-')[2])
          const rawValue = midiState.ccValues[ccNumber] ?? 0
          const normalizedValue = rawValue / 127
          applyModulation(routing.targetParam, Math.max(0, Math.min(1, normalizedValue * routing.depth)))
        }
      }

      // Audio reactive band routings
      const audioReactive = useAudioReactiveStore.getState()
      if (audioReactive.enabled) {
        const audioBands: Record<string, number> = {
          'audio-sub': audioReactive.sub,
          'audio-mid': audioReactive.mid,
          'audio-high': audioReactive.high,
          'audio-hit': audioReactive.hit,
          'audio-rms': audioReactive.rms,
        }
        for (const [trackId, value] of Object.entries(audioBands)) {
          const bandRoutings = currentRoutings.filter(r => r.trackId === trackId)
          for (const routing of bandRoutings) {
            applyModulation(routing.targetParam, Math.max(0, Math.min(1, value * routing.depth)))
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(modulationLoop)
    }

    // Start the loop
    animationFrameId.current = requestAnimationFrame(modulationLoop)

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }
  }, []) // Empty deps - loop manages its own state via getState()
}
