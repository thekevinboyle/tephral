import type { EffectPipeline } from './EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMotionStore } from '../stores/motionStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useRoutingStore } from '../stores/routingStore'

/**
 * Pushes effect parameters straight into shader uniforms via zustand
 * subscriptions — no React render cycle involved. Structural changes
 * (enable/disable/reorder) remain React-driven in Canvas.tsx.
 */
export function initParamSync(pipeline: EffectPipeline): () => void {
  const getMix = (id: string) => useGlitchEngineStore.getState().effectMix[id] ?? 1

  const pushGlitch = () => {
    const s = useGlitchEngineStore.getState()
    pipeline.rgbSplit?.updateParams({ ...s.rgbSplit, mix: getMix('rgb_split') })
    pipeline.chromaticAberration?.updateParams({ ...s.chromaticAberration, mix: getMix('chromatic') })
    pipeline.posterize?.updateParams({ ...s.posterize, mix: getMix('posterize') })
    pipeline.colorGrade?.updateParams({ ...s.colorGrade, mix: getMix('color_grade') })
    pipeline.blockDisplace?.updateParams({ ...s.blockDisplace, mix: getMix('block_displace') })
    pipeline.staticDisplacement?.updateParams({ ...s.staticDisplacement, mix: getMix('static_displace') })
    pipeline.pixelate?.updateParams({ ...s.pixelate, mix: getMix('pixelate') })
    pipeline.lensDistortion?.updateParams({ ...s.lensDistortion, mix: getMix('lens') })
    pipeline.scanLines?.updateParams({ ...s.scanLines, mix: getMix('scan_lines') })
    pipeline.vhsTracking?.updateParams({ ...s.vhsTracking, mix: getMix('vhs') })
    pipeline.noise?.updateParams({ ...s.noise, mix: getMix('noise') })
    pipeline.dither?.updateParams({ ...s.dither, mix: getMix('dither') })
    pipeline.edgeDetection?.updateParams({ ...s.edgeDetection, mix: getMix('edges') })
    pipeline.feedbackLoop?.updateParams({ ...s.feedbackLoop, mix: getMix('feedback') })
  }

  const pushMotion = () => {
    const s = useMotionStore.getState()
    pipeline.motionExtract?.updateParams({ ...s.motionExtract, mix: getMix('motion_extract') })
    pipeline.echoTrail?.updateParams({ ...s.echoTrail, mix: getMix('echo_trail') })
    pipeline.timeSmear?.updateParams({ ...s.timeSmear, mix: getMix('time_smear') })
    pipeline.freezeMask?.updateParams({ ...s.freezeMask, mix: getMix('freeze_mask') })
  }

  const pushDots = () => {
    const s = useAcidStore.getState()
    pipeline.dotsEffect?.updateParams({ ...s.dotsParams, mix: getMix('acid_dots') })
  }

  const pushAscii = () => {
    const p = useAsciiRenderStore.getState().params
    pipeline.asciiEffect?.updateParams({
      mode: p.mode === 'matrix' ? 'standard' : (p.mode as 'standard' | 'blocks' | 'braille'),
      cellSize: p.resolution,
      contrast: p.contrast,
      invert: p.invert,
      colorMode: p.colorMode as 'mono' | 'original' | 'gradient',
      monoColor: p.monoColor,
      gradientEndColor: p.gradientEnd,
      mix: getMix('ascii'),
    })
  }

  const pushDestruction = () => {
    const s = useDestructionStore.getState()
    // Note: destruction-mode override (max datamosh) stays in Canvas.tsx's
    // structural effect — it depends on destructionActive, not these params.
    pipeline.datamosh?.updateParams({ ...s.datamoshParams, mix: getMix('datamosh') })
    pipeline.pixelSort?.updateParams({ ...s.pixelSortParams, mix: getMix('pixelSort') })
    pipeline.sonify?.updateParams({ ...s.sonifyParams, mix: getMix('sonify') })
    pipeline.pointCloud?.updateParams({ ...s.pointCloudParams, mix: getMix('point_cloud') })
  }

  const pushMorph = () => {
    const s = useMorphStore.getState()
    pipeline.faceHud?.updateParams({ ...s.faceHudParams, mix: getMix('face_hud') })
  }

  const pushTrace = () => {
    const s = useVisionTrackingStore.getState()
    pipeline.brightTrace?.updateParams({
      threshold: 0.5,
      trailEnabled: s.brightTraceParams.trailEnabled,
      trailDecay: s.brightTraceParams.trailDecay,
      mix: 0,
    })
    pipeline.motionTrace?.updateParams({
      threshold: 0.1,
      trailEnabled: s.motionTraceParams.trailEnabled,
      trailDecay: s.motionTraceParams.trailDecay,
      sensitivity: s.motionTraceParams.sensitivity,
      mix: 0,
    })
    pipeline.edgeTrace?.updateParams({
      threshold: 0.15,
      trailEnabled: s.edgeTraceParams.trailEnabled,
      trailDecay: s.edgeTraceParams.trailDecay,
      mix: 0,
    })
    pipeline.colorTrace?.updateParams({
      threshold: 0.5,
      trailEnabled: s.colorTraceParams.trailEnabled,
      trailDecay: s.colorTraceParams.trailDecay,
      targetHue: s.colorTraceParams.targetHue,
      hueRange: s.colorTraceParams.hueRange,
      satMin: s.colorTraceParams.satMin,
      valMin: s.colorTraceParams.valMin,
      mix: 0,
    })
    pipeline.faceTrace?.updateParams({
      trailEnabled: s.faceTraceParams.trailEnabled,
      trailDecay: s.faceTraceParams.trailDecay,
      feather: s.faceTraceParams.feather,
      fillMode: s.faceTraceParams.fillMode as 'mesh' | 'oval' | 'bbox',
      mix: 0,
    })
    pipeline.handsTrace?.updateParams({
      trailEnabled: s.handsTraceParams.trailEnabled,
      trailDecay: s.handsTraceParams.trailDecay,
      feather: s.handsTraceParams.feather,
      fillMode: s.handsTraceParams.fillMode as 'skeleton' | 'hull' | 'bbox',
      mix: 0,
    })
  }

  const pushCrossfader = () => {
    pipeline.setCrossfaderPosition(useRoutingStore.getState().crossfaderPosition)
  }

  // Initial push so a fresh pipeline gets current values immediately
  pushGlitch(); pushMotion(); pushDots(); pushAscii()
  pushDestruction(); pushMorph(); pushTrace(); pushCrossfader()

  // Subscribe with reference-equality slice checks (zustand v5 vanilla
  // subscribe gives (state, prevState)). effectMix lives in the glitch
  // store and feeds every group's mix, so a mix change re-pushes all.
  const unsubs = [
    useGlitchEngineStore.subscribe((s, prev) => {
      if (s.effectMix !== prev.effectMix) {
        pushGlitch(); pushMotion(); pushDots(); pushAscii()
        pushDestruction(); pushMorph()
        return
      }
      if (
        s.rgbSplit !== prev.rgbSplit || s.chromaticAberration !== prev.chromaticAberration ||
        s.posterize !== prev.posterize || s.colorGrade !== prev.colorGrade ||
        s.blockDisplace !== prev.blockDisplace || s.staticDisplacement !== prev.staticDisplacement ||
        s.pixelate !== prev.pixelate || s.lensDistortion !== prev.lensDistortion ||
        s.scanLines !== prev.scanLines || s.vhsTracking !== prev.vhsTracking ||
        s.noise !== prev.noise || s.dither !== prev.dither ||
        s.edgeDetection !== prev.edgeDetection || s.feedbackLoop !== prev.feedbackLoop
      ) pushGlitch()
    }),
    useMotionStore.subscribe((s, prev) => {
      if (
        s.motionExtract !== prev.motionExtract || s.echoTrail !== prev.echoTrail ||
        s.timeSmear !== prev.timeSmear || s.freezeMask !== prev.freezeMask
      ) pushMotion()
    }),
    useAcidStore.subscribe((s, prev) => {
      if (s.dotsParams !== prev.dotsParams) pushDots()
    }),
    useAsciiRenderStore.subscribe((s, prev) => {
      if (s.params !== prev.params) pushAscii()
    }),
    useDestructionStore.subscribe((s, prev) => {
      if (
        s.datamoshParams !== prev.datamoshParams || s.pixelSortParams !== prev.pixelSortParams ||
        s.sonifyParams !== prev.sonifyParams || s.pointCloudParams !== prev.pointCloudParams
      ) pushDestruction()
    }),
    useMorphStore.subscribe((s, prev) => {
      if (s.faceHudParams !== prev.faceHudParams) pushMorph()
    }),
    useVisionTrackingStore.subscribe((s, prev) => {
      if (
        s.brightTraceParams !== prev.brightTraceParams || s.motionTraceParams !== prev.motionTraceParams ||
        s.edgeTraceParams !== prev.edgeTraceParams || s.colorTraceParams !== prev.colorTraceParams ||
        s.faceTraceParams !== prev.faceTraceParams || s.handsTraceParams !== prev.handsTraceParams
      ) pushTrace()
    }),
    useRoutingStore.subscribe((s, prev) => {
      if (s.crossfaderPosition !== prev.crossfaderPosition) pushCrossfader()
    }),
  ]

  return () => unsubs.forEach((u) => u())
}
