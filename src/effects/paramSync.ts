import type { EffectPipeline } from './EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMotionStore } from '../stores/motionStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useDestructionModeStore } from '../stores/destructionModeStore'
import { useMorphStore } from '../stores/morphStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useRoutingStore } from '../stores/routingStore'
import { useTrendStore } from '../stores/trendStore'
import { useStrandStore } from '../stores/strandStore'
import { useSegStore } from '../stores/segStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'

/**
 * Pushes effect parameters straight into shader uniforms via zustand
 * subscriptions — no React render cycle involved. Structural changes
 * (enable/disable/reorder) remain React-driven in Canvas.tsx.
 */
export function initParamSync(pipeline: EffectPipeline): () => void {
  const getMix = (id: string) => useGlitchEngineStore.getState().effectMix[id] ?? 1
  const runAll = (pushers: Record<string, () => void>) => {
    for (const push of Object.values(pushers)) push()
  }

  const glitchPushers: Record<string, () => void> = {
    rgb_split: () => { const s = useGlitchEngineStore.getState(); pipeline.rgbSplit?.updateParams({ ...s.rgbSplit, mix: getMix('rgb_split') }) },
    chromatic: () => { const s = useGlitchEngineStore.getState(); pipeline.chromaticAberration?.updateParams({ ...s.chromaticAberration, mix: getMix('chromatic') }) },
    posterize: () => { const s = useGlitchEngineStore.getState(); pipeline.posterize?.updateParams({ ...s.posterize, mix: getMix('posterize') }) },
    color_grade: () => { const s = useGlitchEngineStore.getState(); pipeline.colorGrade?.updateParams({ ...s.colorGrade, mix: getMix('color_grade') }) },
    block_displace: () => { const s = useGlitchEngineStore.getState(); pipeline.blockDisplace?.updateParams({ ...s.blockDisplace, mix: getMix('block_displace') }) },
    static_displace: () => { const s = useGlitchEngineStore.getState(); pipeline.staticDisplacement?.updateParams({ ...s.staticDisplacement, mix: getMix('static_displace') }) },
    pixelate: () => { const s = useGlitchEngineStore.getState(); pipeline.pixelate?.updateParams({ ...s.pixelate, mix: getMix('pixelate') }) },
    lens: () => { const s = useGlitchEngineStore.getState(); pipeline.lensDistortion?.updateParams({ ...s.lensDistortion, mix: getMix('lens') }) },
    scan_lines: () => { const s = useGlitchEngineStore.getState(); pipeline.scanLines?.updateParams({ ...s.scanLines, mix: getMix('scan_lines') }) },
    vhs: () => { const s = useGlitchEngineStore.getState(); pipeline.vhsTracking?.updateParams({ ...s.vhsTracking, mix: getMix('vhs') }) },
    noise: () => { const s = useGlitchEngineStore.getState(); pipeline.noise?.updateParams({ ...s.noise, mix: getMix('noise') }) },
    dither: () => { const s = useGlitchEngineStore.getState(); pipeline.dither?.updateParams({ ...s.dither, mix: getMix('dither') }) },
    edges: () => { const s = useGlitchEngineStore.getState(); pipeline.edgeDetection?.updateParams({ ...s.edgeDetection, fast: s.edgeDetection.fast ?? 0, mix: getMix('edges') }) },
    feedback: () => { const s = useGlitchEngineStore.getState(); pipeline.feedbackLoop?.updateParams({ ...s.feedbackLoop, fast: s.feedbackLoop.fast ?? 0, mix: getMix('feedback') }) },
  }
  const pushGlitch = () => runAll(glitchPushers)

  const motionPushers: Record<string, () => void> = {
    motion_extract: () => { const s = useMotionStore.getState(); pipeline.motionExtract?.updateParams({ ...s.motionExtract, mix: getMix('motion_extract') }) },
    echo_trail: () => { const s = useMotionStore.getState(); pipeline.echoTrail?.updateParams({ ...s.echoTrail, mix: getMix('echo_trail') }) },
    time_smear: () => { const s = useMotionStore.getState(); pipeline.timeSmear?.updateParams({ ...s.timeSmear, mix: getMix('time_smear') }) },
    freeze_mask: () => { const s = useMotionStore.getState(); pipeline.freezeMask?.updateParams({ ...s.freezeMask, mix: getMix('freeze_mask') }) },
  }
  const pushMotion = () => runAll(motionPushers)

  const dotsPushers: Record<string, () => void> = {
    acid_dots: () => { const s = useAcidStore.getState(); pipeline.dotsEffect?.updateParams({ ...s.dotsParams, mix: getMix('acid_dots') }) },
  }
  const pushDots = () => runAll(dotsPushers)

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

  const destructionPushers: Record<string, () => void> = {
    // While destruction mode is active, Canvas.tsx's structural effect owns the
    // datamosh uniforms (max override), so skip pushing store params here —
    // otherwise this would clobber the MAX override on every effectMix change
    // or per-frame modulation write (useContinuousModulation calls
    // updateDatamoshParams every frame).
    datamosh: () => {
      if (useDestructionModeStore.getState().active) return
      const s = useDestructionStore.getState()
      pipeline.datamosh?.updateParams({ ...s.datamoshParams, fast: s.datamoshParams.fast ?? 0, mix: getMix('datamosh') })
    },
    pixelSort: () => { const s = useDestructionStore.getState(); pipeline.pixelSort?.updateParams({ ...s.pixelSortParams, fast: s.pixelSortParams.fast ?? 0, mix: getMix('pixelSort') }) },
    sonify: () => { const s = useDestructionStore.getState(); pipeline.sonify?.updateParams({ ...s.sonifyParams, mix: getMix('sonify') }) },
    point_cloud: () => { const s = useDestructionStore.getState(); pipeline.pointCloud?.updateParams({ ...s.pointCloudParams, mix: getMix('point_cloud') }) },
  }
  const pushDestruction = () => runAll(destructionPushers)

  const morphPushers: Record<string, () => void> = {
    face_hud: () => { const s = useMorphStore.getState(); pipeline.faceHud?.updateParams({ ...s.faceHudParams, mix: getMix('face_hud') }) },
  }
  const pushMorph = () => runAll(morphPushers)

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

  // Trend effects (Phase 2) — pushes params for all 16 trend effects to their
  // pipeline instances, with per-effect mix driven by the routing crossfader.
  const trendPushers: Record<string, () => void> = {
    kaleidoscope: () => { const s = useTrendStore.getState(); pipeline.kaleidoscope?.updateParams({ ...s.kaleidoscopeParams, mix: getMix('kaleidoscope') }) },
    ripple_warp: () => { const s = useTrendStore.getState(); pipeline.rippleWarp?.updateParams({ ...s.rippleWarpParams, mix: getMix('ripple_warp') }) },
    fractal_domain: () => { const s = useTrendStore.getState(); pipeline.fractalDomain?.updateParams({ ...s.fractalDomainParams, mix: getMix('fractal_domain') }) },
    thermal: () => { const s = useTrendStore.getState(); pipeline.thermal?.updateParams({ ...s.thermalParams, mix: getMix('thermal') }) },
    y2k_digicam: () => { const s = useTrendStore.getState(); pipeline.y2kDigicam?.updateParams({ ...s.y2kParams, mix: getMix('y2k_digicam') }) },
    halation: () => { const s = useTrendStore.getState(); pipeline.halation?.updateParams({ ...s.halationParams, fast: s.halationParams.fast ?? 0, mix: getMix('halation') }) },
    anamorphic: () => { const s = useTrendStore.getState(); pipeline.anamorphic?.updateParams({ ...s.anamorphicParams, fast: s.anamorphicParams.fast ?? 0, mix: getMix('anamorphic') }) },
    dreamcore: () => { const s = useTrendStore.getState(); pipeline.dreamcore?.updateParams({ ...s.dreamcoreParams, mix: getMix('dreamcore') }) },
    liquid_morph: () => { const s = useTrendStore.getState(); pipeline.liquidMorph?.updateParams({ ...s.liquidMorphParams, fast: s.liquidMorphParams.fast ?? 0, mix: getMix('liquid_morph') }) },
    crystallize: () => { const s = useTrendStore.getState(); pipeline.crystallize?.updateParams({ ...s.crystallizeParams, mix: getMix('crystallize') }) },
    feedback_tunnel: () => { const s = useTrendStore.getState(); pipeline.feedbackTunnel?.updateParams({ ...s.feedbackTunnelParams, mix: getMix('feedback_tunnel') }) },
    opium_trails: () => { const s = useTrendStore.getState(); pipeline.opiumTrails?.updateParams({ ...s.opiumTrailsParams, mix: getMix('opium_trails') }) },
    flow_smear: () => { const s = useTrendStore.getState(); pipeline.flowSmear?.updateParams({ ...s.flowSmearParams, mix: getMix('flow_smear') }) },
    reaction_diffusion: () => { const s = useTrendStore.getState(); pipeline.reactionDiffusion?.updateParams({ ...s.reactionDiffusionParams, mix: getMix('reaction_diffusion') }) },
    rutt_etra: () => { const s = useTrendStore.getState(); pipeline.ruttEtra?.updateParams({ ...s.ruttEtraParams, mix: getMix('rutt_etra') }) },
    physarum: () => { const s = useTrendStore.getState(); pipeline.physarum?.updateParams({ ...s.physarumParams, mix: getMix('physarum') }) },
  }
  const pushTrend = () => runAll(trendPushers)

  // SEG_EXP effects
  const segPushers: Record<string, () => void> = {
    seg_voxel: () => { const s = useSegStore.getState(); pipeline.segVoxel?.updateParams({ ...s.voxelParams, mix: s.voxelParams.mix * getMix('seg_voxel') }) },
    seg_echo: () => { const s = useSegStore.getState(); pipeline.segEcho?.updateParams({ ...s.echoParams, mix: s.echoParams.mix * getMix('seg_echo') }) },
    seg_matter: () => { const s = useSegStore.getState(); pipeline.segMatter?.updateParams({ ...s.matterParams, mix: s.matterParams.mix * getMix('seg_matter') }) },
    seg_stale: () => { const s = useSegStore.getState(); pipeline.segStale?.updateParams({ ...s.staleParams, mix: s.staleParams.mix * getMix('seg_stale') }) },
    seg_torn: () => { const s = useSegStore.getState(); pipeline.segTorn?.updateParams({ ...s.tornParams, mix: s.tornParams.mix * getMix('seg_torn') }) },
    seg_redact: () => { const s = useSegStore.getState(); pipeline.segRedact?.updateParams({ ...s.redactParams, mix: s.redactParams.mix * getMix('seg_redact') }) },
    seg_backdrop: () => { const s = useSegStore.getState(); pipeline.segBackdrop?.updateParams({ ...s.backdropParams, mix: s.backdropParams.mix * getMix('seg_backdrop') }) },
    seg_facelock: () => { const s = useSegStore.getState(); pipeline.segFaceLock?.updateParams({ ...s.faceLockParams, mix: s.faceLockParams.mix * getMix('seg_facelock') }) },
  }
  const pushSeg = () => runAll(segPushers)
  const pushBpm = () => {
    const bpm = useEffectSequencerStore.getState().bpm
    pipeline.segMatter?.setBpm(bpm)
    pipeline.segStale?.setBpm(bpm)
    pipeline.segRedact?.setBpm(bpm)
    pipeline.segFaceLock?.setBpm(bpm)
    pipeline.segBackdrop?.setBpm(bpm)
  }

  // ACID overlay effects (Phase 3 GPU port) — empty until each port task
  // adds its own `pipeline.<camel>?.updateParams({ ...s.<camel>Params, mix:
  // getMix('acid_<id>') })` line here (the optional-chain no-ops until that
  // effect's pipeline property exists, matching the null-filtered
  // enabledMap pattern in EffectPipeline).
  const acidPortsPushers: Record<string, () => void> = {
    acid_mirror: () => { const s = useAcidStore.getState(); pipeline.acidMirror?.updateParams({ ...s.mirrorParams, preserveVideo: s.preserveVideo, mix: getMix('acid_mirror') }) },
    acid_ripple: () => { const s = useAcidStore.getState(); pipeline.acidRipple?.updateParams({ ...s.rippleParams, preserveVideo: s.preserveVideo, mix: getMix('acid_ripple') }) },
    acid_scan: () => { const s = useAcidStore.getState(); pipeline.acidScan?.updateParams({ ...s.scanParams, preserveVideo: s.preserveVideo, mix: getMix('acid_scan') }) },
    acid_slice: () => { const s = useAcidStore.getState(); pipeline.acidSlice?.updateParams({ ...s.sliceParams, preserveVideo: s.preserveVideo, mix: getMix('acid_slice') }) },
    acid_thgrid: () => { const s = useAcidStore.getState(); pipeline.acidThgrid?.updateParams({ ...s.thGridParams, preserveVideo: s.preserveVideo, mix: getMix('acid_thgrid') }) },
    acid_halftone: () => { const s = useAcidStore.getState(); pipeline.acidHalftone?.updateParams({ ...s.halftoneParams, preserveVideo: s.preserveVideo, mix: getMix('acid_halftone') }) },
    acid_led: () => { const s = useAcidStore.getState(); pipeline.acidLed?.updateParams({ ...s.ledParams, preserveVideo: s.preserveVideo, mix: getMix('acid_led') }) },
    acid_hex: () => { const s = useAcidStore.getState(); pipeline.acidHex?.updateParams({ ...s.hexParams, preserveVideo: s.preserveVideo, mix: getMix('acid_hex') }) },
    acid_glyph: () => { const s = useAcidStore.getState(); pipeline.acidGlyph?.updateParams({ ...s.glyphParams, preserveVideo: s.preserveVideo, mix: getMix('acid_glyph') }) },
    acid_icons: () => { const s = useAcidStore.getState(); pipeline.acidIcons?.updateParams({ ...s.iconsParams, preserveVideo: s.preserveVideo, mix: getMix('acid_icons') }) },
    acid_contour: () => { const s = useAcidStore.getState(); pipeline.acidContour?.updateParams({ ...s.contourParams, preserveVideo: s.preserveVideo, mix: getMix('acid_contour') }) },
  }
  const pushAcidPorts = () => runAll(acidPortsPushers)

  // STRAND overlay effects (Phase 3 GPU port) — same empty scaffold as
  // pushAcidPorts(); each port task adds its own push line.
  const strandPortsPushers: Record<string, () => void> = {
    strand_beach: () => { const s = useStrandStore.getState(); pipeline.strandBeach?.updateParams({ ...s.beachStaticParams, mix: getMix('strand_beach') }) },
    strand_voidout: () => { const s = useStrandStore.getState(); pipeline.strandVoidout?.updateParams({ ...s.voidOutParams, mix: getMix('strand_voidout') }) },
    strand_seam: () => { const s = useStrandStore.getState(); pipeline.strandSeam?.updateParams({ ...s.seamParams, mix: getMix('strand_seam') }) },
    strand_cloud: () => { const s = useStrandStore.getState(); pipeline.strandCloud?.updateParams({ ...s.chiralCloudParams, mix: getMix('strand_cloud') }) },
    strand_dooms: () => { const s = useStrandStore.getState(); pipeline.strandDooms?.updateParams({ ...s.doomsParams, mix: getMix('strand_dooms') }) },
    strand_bridge: () => { const s = useStrandStore.getState(); pipeline.strandBridge?.updateParams({ ...s.bridgeLinkParams, mix: getMix('strand_bridge') }) },
    strand_web: () => { const s = useStrandStore.getState(); pipeline.strandWeb?.updateParams({ ...s.strandWebParams, mix: getMix('strand_web') }) },
    strand_timefall: () => { const s = useStrandStore.getState(); pipeline.strandTimefall?.updateParams({ ...s.timefallParams, mix: getMix('strand_timefall') }) },
    strand_umbilical: () => { const s = useStrandStore.getState(); pipeline.strandUmbilical?.updateParams({ ...s.umbilicalParams, mix: getMix('strand_umbilical') }) },
    strand_handprints: () => { const s = useStrandStore.getState(); pipeline.strandHandprints?.updateParams({ ...s.handprintsParams, mix: getMix('strand_handprints') }) },
    strand_bbpod: () => { const s = useStrandStore.getState(); pipeline.strandBbpod?.updateParams({ ...s.bbPodParams, mix: getMix('strand_bbpod') }) },
    strand_chiralium: () => { const s = useStrandStore.getState(); pipeline.strandChiralium?.updateParams({ ...s.chiraliumParams, mix: getMix('strand_chiralium') }) },
    strand_odradek: () => { const s = useStrandStore.getState(); pipeline.strandOdradek?.updateParams({ ...s.odradekParams, mix: getMix('strand_odradek') }) },
    strand_tar: () => { const s = useStrandStore.getState(); pipeline.strandTar?.updateParams({ ...s.tarSpreadParams, mix: getMix('strand_tar') }) },
    strand_extinction: () => { const s = useStrandStore.getState(); pipeline.strandExtinction?.updateParams({ ...s.extinctionParams, mix: getMix('strand_extinction') }) },
    strand_path: () => { const s = useStrandStore.getState(); pipeline.strandChiralPath?.updateParams({ ...s.chiralPathParams, mix: getMix('strand_path') }) },
  }
  const pushStrandPorts = () => runAll(strandPortsPushers)

  // Initial push so a fresh pipeline gets current values immediately
  pushGlitch(); pushMotion(); pushDots(); pushAscii()
  pushDestruction(); pushMorph(); pushTrace(); pushCrossfader(); pushTrend()
  pushAcidPorts(); pushStrandPorts()
  pushSeg(); pushBpm()

  // One pusher per effect id, for dry/wet changes. Strand ports come after
  // destruction so the strand store's params win for the effects both push
  // (odradek, tar, extinction, path), as when every group was re-pushed.
  const mixPushers: Record<string, () => void> = {
    ...glitchPushers, ...motionPushers, ...dotsPushers, ascii: pushAscii,
    ...destructionPushers, ...morphPushers, ...trendPushers,
    ...acidPortsPushers, ...strandPortsPushers, ...segPushers,
  }

  // Subscribe with reference-equality slice checks (zustand v5 vanilla
  // subscribe gives (state, prevState)). effectMix lives in the glitch
  // store; a change re-pushes only the effects whose mix changed (a
  // modulated dry/wet writes it every frame).
  const unsubs = [
    useGlitchEngineStore.subscribe((s, prev) => {
      if (s.effectMix !== prev.effectMix) {
        for (const id of new Set([...Object.keys(s.effectMix), ...Object.keys(prev.effectMix)])) {
          if (s.effectMix[id] !== prev.effectMix[id]) mixPushers[id]?.()
        }
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
      if (
        s.mirrorParams !== prev.mirrorParams || s.rippleParams !== prev.rippleParams ||
        s.scanParams !== prev.scanParams || s.sliceParams !== prev.sliceParams ||
        s.thGridParams !== prev.thGridParams || s.contourParams !== prev.contourParams ||
        s.glyphParams !== prev.glyphParams || s.halftoneParams !== prev.halftoneParams ||
        s.hexParams !== prev.hexParams || s.iconsParams !== prev.iconsParams ||
        s.ledParams !== prev.ledParams || s.preserveVideo !== prev.preserveVideo
      ) pushAcidPorts()
    }),
    useStrandStore.subscribe((s, prev) => {
      if (
        s.handprintsParams !== prev.handprintsParams || s.tarSpreadParams !== prev.tarSpreadParams ||
        s.timefallParams !== prev.timefallParams || s.voidOutParams !== prev.voidOutParams ||
        s.strandWebParams !== prev.strandWebParams || s.bridgeLinkParams !== prev.bridgeLinkParams ||
        s.chiralPathParams !== prev.chiralPathParams || s.umbilicalParams !== prev.umbilicalParams ||
        s.odradekParams !== prev.odradekParams || s.chiraliumParams !== prev.chiraliumParams ||
        s.beachStaticParams !== prev.beachStaticParams || s.doomsParams !== prev.doomsParams ||
        s.chiralCloudParams !== prev.chiralCloudParams || s.bbPodParams !== prev.bbPodParams ||
        s.seamParams !== prev.seamParams || s.extinctionParams !== prev.extinctionParams
      ) pushStrandPorts()
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
    useTrendStore.subscribe((s, prev) => {
      if (
        s.halationParams !== prev.halationParams || s.y2kParams !== prev.y2kParams ||
        s.thermalParams !== prev.thermalParams || s.dreamcoreParams !== prev.dreamcoreParams ||
        s.anamorphicParams !== prev.anamorphicParams || s.flowSmearParams !== prev.flowSmearParams ||
        s.feedbackTunnelParams !== prev.feedbackTunnelParams || s.opiumTrailsParams !== prev.opiumTrailsParams ||
        s.ruttEtraParams !== prev.ruttEtraParams || s.reactionDiffusionParams !== prev.reactionDiffusionParams ||
        s.physarumParams !== prev.physarumParams || s.kaleidoscopeParams !== prev.kaleidoscopeParams ||
        s.liquidMorphParams !== prev.liquidMorphParams || s.crystallizeParams !== prev.crystallizeParams ||
        s.rippleWarpParams !== prev.rippleWarpParams || s.fractalDomainParams !== prev.fractalDomainParams
      ) pushTrend()
    }),
    // Exiting destruction mode hands datamosh uniforms back to paramSync —
    // re-push immediately so the user's datamoshParams restore without
    // waiting for an unrelated store change. Entering destruction mode
    // (false→true) is handled by Canvas.tsx's structural effect applying
    // the MAX override; nothing to do here for that direction.
    useDestructionModeStore.subscribe((s, prev) => {
      if (prev.active && !s.active) pushDestruction()
    }),
    useSegStore.subscribe((s, prev) => {
      if (
        s.voxelParams !== prev.voxelParams || s.echoParams !== prev.echoParams ||
        s.matterParams !== prev.matterParams || s.staleParams !== prev.staleParams ||
        s.tornParams !== prev.tornParams || s.redactParams !== prev.redactParams || s.faceLockParams !== prev.faceLockParams || s.backdropParams !== prev.backdropParams
      ) pushSeg()
    }),
    useEffectSequencerStore.subscribe((s, prev) => {
      if (s.bpm !== prev.bpm) pushBpm()
    }),
  ]

  return () => unsubs.forEach((u) => u())
}
