import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { useVideoTexture } from '../hooks/useVideoTexture'
import { EffectPipeline } from '../effects/EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMotionStore } from '../stores/motionStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useMediaStore } from '../stores/mediaStore'
import { useRoutingStore } from '../stores/routingStore'
import { useTrendStore } from '../stores/trendStore'
import { useSegStore } from '../stores/segStore'
import { useStrandStore } from '../stores/strandStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useDestructionModeStore } from '../stores/destructionModeStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useSlicerStore } from '../stores/slicerStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { SlicerEngine } from '../effects/slicer/SlicerEngine'
import { slicerCommands, slicerReadout, slicerViewers } from '../effects/slicer/slicerRuntime'
import { getTransportBeats } from '../effects/lines/linePhase'
import { HdrToSdrPass, detectHdr, type HdrTransfer } from '../effects/HdrToSdrPass'
import { OverlayContainer } from './overlays/OverlayContainer'
import { perfMonitor } from '../utils/perfMonitor'
import { initParamSync } from '../effects/paramSync'
import { advanceReadbackFrame } from './overlays/sharedReadback'
import { WarpCompositor, type WarpVideoOptions } from '../effects/warp/WarpCompositor'
import { WarpPostPass } from '../effects/warp/WarpPostPass'
import { setActiveWarpCompositor } from '../effects/warp/warpRegistry'
import { getHeardWarpPosition, warpLoopSecondsAt, warpNow } from '../effects/warp/warpClock'
import { delayAtX } from '../effects/warp/warpMath'
import { playPosition, slicesFor, WARP_SEED, type PlayParams } from '../effects/playhead'
import { useWarpStore } from '../stores/warpStore'
import { tierLimits, usePerfTierStore } from '../stores/perfTierStore'

/**
 * What the pipeline is fed without the warp (set by the input effect). `live` is the texture the
 * warp and the slicer capture (the media texture); null with no media, so neither runs on the
 * placeholder. While the slicer is on, the render loop swaps in its picture as the base.
 */
interface WarpBase {
  input: THREE.Texture
  source: THREE.Texture | null
  live: THREE.Texture | null
  aspect: () => number
  /** Pixel size of the picture (null for the placeholder). */
  size: () => [number, number] | null
}


export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null
}

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)
  const mediaTexture = useVideoTexture()
  const { videoElement, imageElement } = useMediaStore()
  const { previewTime } = useRecordingStore()
  const destructionActive = useDestructionModeStore((state) => state.active)

  // Destruction store (performance grid controlled datamosh and pixel sort)
  const {
    datamoshEnabled,
    pixelSortEnabled,
    sonifyEnabled,
    pointCloudEnabled,
  } = useDestructionStore()

  // Face HUD state
  const {
    faceHudEnabled,
  } = useMorphStore()

  // Slicer: only its on/off and effects bypass reach React; the picture is driven from the rAF loop
  const slicerEnabled = useSlicerStore((s) => s.enabled)
  const slicerProcessEffects = useSlicerStore((s) => s.processEffects)
  const slicerHasOwnFrames = useSlicerStore((s) => s.captureState !== 'live')
  const slicerEngine = useRef<SlicerEngine | null>(null)
  // HDR video (iPhone HLG, HDR10 PQ): Chrome gives WebGL the coded signal, so the loop converts it to SDR first
  // (undefined = not read yet: the render loop retries)
  const hdrInfo = useRef<{ transfer: HdrTransfer; bt2020: boolean } | null | undefined>(null)

  // Video time warp: driven from the rAF loop, never from React state
  const warpBase = useRef<WarpBase | null>(null)
  const warpCompositor = useRef<WarpCompositor | null>(null)
  // Textures the pipeline was last given as input and source; the loop pushes only on a change
  const applied = useRef<{ input: THREE.Texture | null; source: THREE.Texture | null }>({ input: null, source: null })

  // Expose canvas element via ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => renderer?.domElement ?? null
  }), [renderer])

  const {
    enabled: glitchEnabled,
    rgbSplitEnabled,
    chromaticAberrationEnabled,
    posterizeEnabled,
    colorGradeEnabled,
    blockDisplaceEnabled,
    staticDisplacementEnabled,
    pixelateEnabled,
    lensDistortionEnabled,
    scanLinesEnabled,
    vhsTrackingEnabled,
    noiseEnabled,
    ditherEnabled,
    edgeDetectionEnabled,
    feedbackLoopEnabled,
    bypassActive,
    effectBypassed,
    soloEffectId,
  } = useGlitchEngineStore()

  // Motion effects state
  const {
    motionExtractEnabled,
    echoTrailEnabled,
    timeSmearEnabled,
    freezeMaskEnabled,
  } = useMotionStore()

  // Vision effects (GPU overlay versions)
  const {
    dotsEnabled,
  } = useAcidStore()

  // ACID GPU-ported effects (Phase 3) — enabled flags only; params flow
  // through paramSync.ts. All 11 render as GPU passes in EffectPipeline;
  // AcidOverlay.tsx no longer has a CPU dispatch for any of these (it now
  // only owns decomp + the already-GPU cloud/slit/voronoi sub-effects).
  const {
    mirrorEnabled,
    rippleEnabled,
    scanEnabled,
    sliceEnabled,
    thGridEnabled,
    contourEnabled,
    glyphEnabled,
    halftoneEnabled,
    hexEnabled,
    iconsEnabled,
    ledEnabled,
  } = useAcidStore()

  // STRAND GPU-ported effects (Phase 3) — enabled flags only; params flow
  // through paramSync.ts. All 16 render as GPU passes in EffectPipeline;
  // StrandOverlay.tsx has been deleted entirely (see docs/plans/... Phase 3
  // teardown, Task 15).
  const {
    handprintsEnabled,
    tarSpreadEnabled,
    timefallEnabled,
    voidOutEnabled,
    strandWebEnabled,
    bridgeLinkEnabled,
    chiralPathEnabled,
    umbilicalEnabled,
    odradekEnabled,
    chiraliumEnabled,
    beachStaticEnabled,
    doomsEnabled,
    chiralCloudEnabled,
    bbPodEnabled,
    seamEnabled,
    extinctionEnabled,
  } = useStrandStore()

  const {
    enabled: asciiEnabled,
    params: asciiParams,
  } = useAsciiRenderStore()

  // Vision tracking (trace effects)
  const {
    brightEnabled,
    edgeEnabled,
    colorEnabled,
    motionEnabled,
    faceEnabled,
    handsEnabled,
  } = useVisionTrackingStore()

  // Landmarks for face/hands trace effects
  const { faces, hands } = useLandmarksStore()

  // Trend effects (Phase 2) — enabled flags only; params flow through paramSync.ts
  const {
    halationEnabled,
    y2kEnabled,
    thermalEnabled,
    dreamcoreEnabled,
    anamorphicEnabled,
    flowSmearEnabled,
    feedbackTunnelEnabled,
    opiumTrailsEnabled,
    ruttEtraEnabled,
    reactionDiffusionEnabled,
    physarumEnabled,
    kaleidoscopeEnabled,
    liquidMorphEnabled,
    crystallizeEnabled,
    rippleWarpEnabled,
    fractalDomainEnabled,
  } = useTrendStore()
  const { voxelEnabled: segVoxelEnabled, echoEnabled: segEchoEnabled, matterEnabled: segMatterEnabled,
    staleEnabled: segStaleEnabled, tornEnabled: segTornEnabled } = useSegStore()
  const segRedactEnabled = useSegStore((s) => s.redactEnabled)
  const segFaceLockEnabled = useSegStore((s) => s.faceLockEnabled)
  const segBackdropEnabled = useSegStore((s) => s.backdropEnabled)

  // Trace mask routing
  const { effectTraceMask } = useRoutingStore()

  // Solo filtering: when soloing, only the soloed effect passes through
  // Also bypass all effects when slicer is active and processEffects is false
  const isSoloing = soloEffectId !== null
  const slicerBypassingEffects = slicerEnabled && !slicerProcessEffects
  const getEffectiveEnabled = (effectId: string, actualEnabled: boolean) => {
    if (slicerBypassingEffects) return false
    if (!isSoloing) return actualEnabled
    return soloEffectId === effectId && actualEnabled
  }

  const { effectOrder, crossfaderPosition } = useRoutingStore()

  // Initialize pipeline
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)
    // Dev only: the timing harness (.superpowers/sdd/fx-timing.mjs) renders it directly
    const devWindow = window as unknown as { __pipeline?: EffectPipeline }
    if (import.meta.env.DEV) devWindow.__pipeline = newPipeline

    return () => {
      if (devWindow.__pipeline === newPipeline) delete devWindow.__pipeline
      newPipeline.dispose()
    }
  }, [renderer])

  // Param sync: direct store→uniform writes, outside the React render cycle
  useEffect(() => {
    if (!pipeline) return
    return initParamSync(pipeline)
  }, [pipeline])

  // Structural effect: enable/disable/reorder only. Per-frame param pushes
  // live in paramSync.ts (direct zustand subscriptions), which keeps this
  // effect's dependency array free of param objects.
  useEffect(() => {
    if (!pipeline) return

    // Add datamosh to effect order when destruction mode is active
    const activeEffectOrder = destructionActive
      ? ['datamosh', ...effectOrder]
      : effectOrder

    pipeline.updateEffects({
      effectOrder: activeEffectOrder,
      rgbSplitEnabled: getEffectiveEnabled('rgb_split', glitchEnabled && rgbSplitEnabled && !effectBypassed['rgb_split']),
      chromaticAberrationEnabled: getEffectiveEnabled('chromatic', glitchEnabled && chromaticAberrationEnabled && !effectBypassed['chromatic']),
      posterizeEnabled: getEffectiveEnabled('posterize', glitchEnabled && posterizeEnabled && !effectBypassed['posterize']),
      colorGradeEnabled: getEffectiveEnabled('color_grade', glitchEnabled && colorGradeEnabled && !effectBypassed['color_grade']),
      blockDisplaceEnabled: getEffectiveEnabled('block_displace', glitchEnabled && blockDisplaceEnabled && !effectBypassed['block_displace']),
      staticDisplacementEnabled: getEffectiveEnabled('static_displace', glitchEnabled && staticDisplacementEnabled && !effectBypassed['static_displace']),
      pixelateEnabled: getEffectiveEnabled('pixelate', glitchEnabled && pixelateEnabled && !effectBypassed['pixelate']),
      lensDistortionEnabled: getEffectiveEnabled('lens', glitchEnabled && lensDistortionEnabled && !effectBypassed['lens']),
      scanLinesEnabled: getEffectiveEnabled('scan_lines', glitchEnabled && scanLinesEnabled && !effectBypassed['scan_lines']),
      vhsTrackingEnabled: getEffectiveEnabled('vhs', glitchEnabled && vhsTrackingEnabled && !effectBypassed['vhs']),
      noiseEnabled: getEffectiveEnabled('noise', glitchEnabled && noiseEnabled && !effectBypassed['noise']),
      ditherEnabled: getEffectiveEnabled('dither', glitchEnabled && ditherEnabled && !effectBypassed['dither']),
      edgeDetectionEnabled: getEffectiveEnabled('edges', glitchEnabled && edgeDetectionEnabled && !effectBypassed['edges']),
      feedbackLoopEnabled: getEffectiveEnabled('feedback', glitchEnabled && feedbackLoopEnabled && !effectBypassed['feedback']),
      // Motion effects (not affected by glitchEnabled - separate system)
      motionExtractEnabled: getEffectiveEnabled('motion_extract', motionExtractEnabled),
      echoTrailEnabled: getEffectiveEnabled('echo_trail', echoTrailEnabled),
      timeSmearEnabled: getEffectiveEnabled('time_smear', timeSmearEnabled),
      freezeMaskEnabled: getEffectiveEnabled('freeze_mask', freezeMaskEnabled),
      // Vision effects (GPU overlay versions) - not affected by glitchEnabled
      dotsEnabled: getEffectiveEnabled('acid_dots', dotsEnabled && !effectBypassed['acid_dots']),
      asciiEnabled: getEffectiveEnabled('ascii', asciiEnabled && !effectBypassed['ascii'] && asciiParams.mode !== 'matrix'),
      // Destruction mode datamosh effect - enabled via destruction mode OR performance grid
      datamoshEnabled: getEffectiveEnabled('datamosh', (destructionActive || datamoshEnabled) && !effectBypassed['datamosh']),
      // Pixel sort - performance grid only
      pixelSortEnabled: getEffectiveEnabled('pixelSort', pixelSortEnabled && !effectBypassed['pixelSort']),
      // Sonify - performance grid only
      sonifyEnabled: getEffectiveEnabled('sonify', sonifyEnabled && !effectBypassed['sonify']),
      // Point cloud - performance grid only
      pointCloudEnabled: getEffectiveEnabled('point_cloud', pointCloudEnabled && !effectBypassed['point_cloud']),
      faceHudEnabled: getEffectiveEnabled('face_hud', faceHudEnabled && !effectBypassed['face_hud']),
      // Trace effects
      brightTraceEnabled: getEffectiveEnabled('track_bright', brightEnabled),
      motionTraceEnabled: getEffectiveEnabled('track_motion', motionEnabled),
      edgeTraceEnabled: getEffectiveEnabled('track_edge', edgeEnabled),
      colorTraceEnabled: getEffectiveEnabled('track_color', colorEnabled),
      faceTraceEnabled: getEffectiveEnabled('track_face', faceEnabled),
      handsTraceEnabled: getEffectiveEnabled('track_hands', handsEnabled),
      // Trend effects (Phase 2) - not affected by glitchEnabled
      halationEnabled: getEffectiveEnabled('halation', halationEnabled && !effectBypassed['halation']),
      y2kEnabled: getEffectiveEnabled('y2k_digicam', y2kEnabled && !effectBypassed['y2k_digicam']),
      thermalEnabled: getEffectiveEnabled('thermal', thermalEnabled && !effectBypassed['thermal']),
      dreamcoreEnabled: getEffectiveEnabled('dreamcore', dreamcoreEnabled && !effectBypassed['dreamcore']),
      anamorphicEnabled: getEffectiveEnabled('anamorphic', anamorphicEnabled && !effectBypassed['anamorphic']),
      flowSmearEnabled: getEffectiveEnabled('flow_smear', flowSmearEnabled && !effectBypassed['flow_smear']),
      feedbackTunnelEnabled: getEffectiveEnabled('feedback_tunnel', feedbackTunnelEnabled && !effectBypassed['feedback_tunnel']),
      opiumTrailsEnabled: getEffectiveEnabled('opium_trails', opiumTrailsEnabled && !effectBypassed['opium_trails']),
      ruttEtraEnabled: getEffectiveEnabled('rutt_etra', ruttEtraEnabled && !effectBypassed['rutt_etra']),
      reactionDiffusionEnabled: getEffectiveEnabled('reaction_diffusion', reactionDiffusionEnabled && !effectBypassed['reaction_diffusion']),
      physarumEnabled: getEffectiveEnabled('physarum', physarumEnabled && !effectBypassed['physarum']),
      kaleidoscopeEnabled: getEffectiveEnabled('kaleidoscope', kaleidoscopeEnabled && !effectBypassed['kaleidoscope']),
      liquidMorphEnabled: getEffectiveEnabled('liquid_morph', liquidMorphEnabled && !effectBypassed['liquid_morph']),
      crystallizeEnabled: getEffectiveEnabled('crystallize', crystallizeEnabled && !effectBypassed['crystallize']),
      rippleWarpEnabled: getEffectiveEnabled('ripple_warp', rippleWarpEnabled && !effectBypassed['ripple_warp']),
      fractalDomainEnabled: getEffectiveEnabled('fractal_domain', fractalDomainEnabled && !effectBypassed['fractal_domain']),
      // SEG_EXP effects
      segVoxelEnabled: getEffectiveEnabled('seg_voxel', segVoxelEnabled && !effectBypassed['seg_voxel']),
      segEchoEnabled: getEffectiveEnabled('seg_echo', segEchoEnabled && !effectBypassed['seg_echo']),
      segMatterEnabled: getEffectiveEnabled('seg_matter', segMatterEnabled && !effectBypassed['seg_matter']),
      segStaleEnabled: getEffectiveEnabled('seg_stale', segStaleEnabled && !effectBypassed['seg_stale']),
      segTornEnabled: getEffectiveEnabled('seg_torn', segTornEnabled && !effectBypassed['seg_torn']),
      segRedactEnabled: getEffectiveEnabled('seg_redact', segRedactEnabled && !effectBypassed['seg_redact']),
      segFaceLockEnabled: getEffectiveEnabled('seg_facelock', segFaceLockEnabled && !effectBypassed['seg_facelock']),
      segBackdropEnabled: getEffectiveEnabled('seg_backdrop', segBackdropEnabled && !effectBypassed['seg_backdrop']),
      // ACID GPU-ported effects (Phase 3) - not affected by glitchEnabled;
      // rendered as GPU passes in EffectPipeline (getEffectById cases live
      // there). AcidOverlay.tsx no longer dispatches any of these.
      mirrorEnabled: getEffectiveEnabled('acid_mirror', mirrorEnabled && !effectBypassed['acid_mirror']),
      rippleEnabled: getEffectiveEnabled('acid_ripple', rippleEnabled && !effectBypassed['acid_ripple']),
      scanEnabled: getEffectiveEnabled('acid_scan', scanEnabled && !effectBypassed['acid_scan']),
      sliceEnabled: getEffectiveEnabled('acid_slice', sliceEnabled && !effectBypassed['acid_slice']),
      thGridEnabled: getEffectiveEnabled('acid_thgrid', thGridEnabled && !effectBypassed['acid_thgrid']),
      contourEnabled: getEffectiveEnabled('acid_contour', contourEnabled && !effectBypassed['acid_contour']),
      glyphEnabled: getEffectiveEnabled('acid_glyph', glyphEnabled && !effectBypassed['acid_glyph']),
      halftoneEnabled: getEffectiveEnabled('acid_halftone', halftoneEnabled && !effectBypassed['acid_halftone']),
      hexEnabled: getEffectiveEnabled('acid_hex', hexEnabled && !effectBypassed['acid_hex']),
      iconsEnabled: getEffectiveEnabled('acid_icons', iconsEnabled && !effectBypassed['acid_icons']),
      ledEnabled: getEffectiveEnabled('acid_led', ledEnabled && !effectBypassed['acid_led']),
      // STRAND GPU-ported effects (Phase 3) - not affected by glitchEnabled;
      // rendered as GPU passes in EffectPipeline. StrandOverlay.tsx has been
      // deleted entirely.
      handprintsEnabled: getEffectiveEnabled('strand_handprints', handprintsEnabled && !effectBypassed['strand_handprints']),
      tarSpreadEnabled: getEffectiveEnabled('strand_tar', tarSpreadEnabled && !effectBypassed['strand_tar']),
      timefallEnabled: getEffectiveEnabled('strand_timefall', timefallEnabled && !effectBypassed['strand_timefall']),
      voidOutEnabled: getEffectiveEnabled('strand_voidout', voidOutEnabled && !effectBypassed['strand_voidout']),
      strandWebEnabled: getEffectiveEnabled('strand_web', strandWebEnabled && !effectBypassed['strand_web']),
      bridgeLinkEnabled: getEffectiveEnabled('strand_bridge', bridgeLinkEnabled && !effectBypassed['strand_bridge']),
      chiralPathEnabled: getEffectiveEnabled('strand_path', chiralPathEnabled && !effectBypassed['strand_path']),
      umbilicalEnabled: getEffectiveEnabled('strand_umbilical', umbilicalEnabled && !effectBypassed['strand_umbilical']),
      odradekEnabled: getEffectiveEnabled('strand_odradek', odradekEnabled && !effectBypassed['strand_odradek']),
      chiraliumEnabled: getEffectiveEnabled('strand_chiralium', chiraliumEnabled && !effectBypassed['strand_chiralium']),
      beachStaticEnabled: getEffectiveEnabled('strand_beach', beachStaticEnabled && !effectBypassed['strand_beach']),
      doomsEnabled: getEffectiveEnabled('strand_dooms', doomsEnabled && !effectBypassed['strand_dooms']),
      chiralCloudEnabled: getEffectiveEnabled('strand_cloud', chiralCloudEnabled && !effectBypassed['strand_cloud']),
      bbPodEnabled: getEffectiveEnabled('strand_bbpod', bbPodEnabled && !effectBypassed['strand_bbpod']),
      seamEnabled: getEffectiveEnabled('strand_seam', seamEnabled && !effectBypassed['strand_seam']),
      extinctionEnabled: getEffectiveEnabled('strand_extinction', extinctionEnabled && !effectBypassed['strand_extinction']),
      bypassActive,
      // Raw flags: keeps the person model loaded across bypass/solo/kill
      segWanted: segVoxelEnabled || segEchoEnabled || segMatterEnabled || segRedactEnabled || segBackdropEnabled,
      crossfaderPosition,
      hasSourceTexture: !!mediaTexture && !slicerEnabled,
      videoWidth: videoElement?.videoWidth || imageElement?.naturalWidth || 1,
      videoHeight: videoElement?.videoHeight || imageElement?.naturalHeight || 1,
    })

    // Update datamosh params - destruction mode overrides with max settings.
    // (Non-destruction-mode param push happens in paramSync.ts.)
    if (pipeline.datamosh && destructionActive) {
      // Crank to max when destruction mode is active
      pipeline.datamosh.updateParams({
        intensity: 0.95,
        blockSize: 12,
        keyframeChance: 0.01,
        chaos: 1.0,
        feedback: 0.9, // High recursive feedback for maximum melt
        mix: 1.0,
      })
    }

    // Face HUD - init face mesh and pass video element (detection runs in update())
    if (pipeline.faceHud) {
      if (faceHudEnabled) {
        pipeline.faceHud.initFaceMesh()
      }
      pipeline.faceHud.setVideoElement(faceHudEnabled ? videoElement : null)
    }

    // Mask dropdowns: the pipeline renders the masks they use and feeds them in every frame
    for (const effectId of ['rgb_split', 'block_displace', 'datamosh']) {
      pipeline.setTraceMaskSource(effectId, effectTraceMask[effectId] ?? 'none')
    }
  }, [
    pipeline,
    glitchEnabled,
    rgbSplitEnabled, chromaticAberrationEnabled, posterizeEnabled, colorGradeEnabled,
    blockDisplaceEnabled, staticDisplacementEnabled, pixelateEnabled, lensDistortionEnabled,
    scanLinesEnabled, vhsTrackingEnabled, noiseEnabled, ditherEnabled,
    edgeDetectionEnabled, feedbackLoopEnabled,
    effectOrder, bypassActive, crossfaderPosition, effectBypassed, soloEffectId,
    motionExtractEnabled, echoTrailEnabled, timeSmearEnabled, freezeMaskEnabled,
    mediaTexture, slicerEnabled, slicerProcessEffects,
    dotsEnabled, asciiEnabled, asciiParams,
    destructionActive,
    datamoshEnabled, pixelSortEnabled, sonifyEnabled, pointCloudEnabled, faceHudEnabled,
    brightEnabled, edgeEnabled, colorEnabled, motionEnabled, faceEnabled, handsEnabled,
    effectTraceMask,
    videoElement,
    halationEnabled, y2kEnabled, thermalEnabled, dreamcoreEnabled, anamorphicEnabled,
    flowSmearEnabled, feedbackTunnelEnabled, opiumTrailsEnabled, ruttEtraEnabled,
    reactionDiffusionEnabled, physarumEnabled, kaleidoscopeEnabled, liquidMorphEnabled,
    crystallizeEnabled, rippleWarpEnabled, fractalDomainEnabled,
    segVoxelEnabled, segEchoEnabled, segMatterEnabled, segStaleEnabled, segTornEnabled, segRedactEnabled, segFaceLockEnabled, segBackdropEnabled,
    mirrorEnabled, rippleEnabled, scanEnabled, sliceEnabled, thGridEnabled,
    contourEnabled, glyphEnabled, halftoneEnabled, hexEnabled, iconsEnabled, ledEnabled,
    handprintsEnabled, tarSpreadEnabled, timefallEnabled, voidOutEnabled, strandWebEnabled,
    bridgeLinkEnabled, chiralPathEnabled, umbilicalEnabled, odradekEnabled, chiraliumEnabled,
    beachStaticEnabled, doomsEnabled, chiralCloudEnabled, bbPodEnabled, seamEnabled, extinctionEnabled,
  ])

  // Landmark data flows at detection cadence — keep it out of the structural effect
  useEffect(() => {
    if (!pipeline) return
    if (pipeline.faceTrace && faceEnabled) {
      pipeline.faceTrace.setFaceLandmarks(faces.map(f => ({
        points: f.points.map(p => ({ x: p.point.x, y: p.point.y })),
        boundingBox: f.boundingBox,
      })))
    }
    if (pipeline.handsTrace && handsEnabled) {
      pipeline.handsTrace.setHandLandmarks(hands.map(h => ({
        points: h.points.map(p => ({ x: p.point.x, y: p.point.y })),
        handedness: h.handedness,
      })))
    }
  }, [pipeline, faces, hands, faceEnabled, handsEnabled])

  // Update input texture and video dimensions
  useEffect(() => {
    if (!pipeline) return

    // Set source texture for crossfader A side
    // Always provide mediaTexture when available - allows crossfading back to source even with slicer active
    if (mediaTexture) {
      pipeline.setSourceTexture(mediaTexture)
      // Set source video dimensions for crossfader aspect ratio
      if (videoElement) {
        pipeline.setSourceVideoSize(videoElement.videoWidth, videoElement.videoHeight)
      } else if (imageElement) {
        pipeline.setSourceVideoSize(imageElement.naturalWidth, imageElement.naturalHeight)
      }
    } else {
      pipeline.setSourceTexture(null)
    }

    // Person segmentation follows the active source (video or still image); the render loop turns it off
    // while the slicer's picture is shown. Known limitation: with the video warp on, the mask still follows
    // the live element, not the warped frame.
    pipeline.segmentation.setSource(videoElement ?? imageElement ?? null)
    pipeline.detection.setSource(videoElement ?? imageElement ?? null)

    if (mediaTexture) {
      pipeline.setInputTexture(mediaTexture)

      // Get video/image dimensions for aspect ratio
      if (videoElement) {
        pipeline.setVideoSize(videoElement.videoWidth, videoElement.videoHeight)
        // When not using slicer, source and input are the same
        pipeline.setSourceVideoSize(videoElement.videoWidth, videoElement.videoHeight)
      } else if (imageElement) {
        pipeline.setVideoSize(imageElement.naturalWidth, imageElement.naturalHeight)
        pipeline.setSourceVideoSize(imageElement.naturalWidth, imageElement.naturalHeight)
      }
      const v = videoElement, im = imageElement
      warpBase.current = {
        input: mediaTexture, source: mediaTexture, live: mediaTexture,
        aspect: () => (v ? v.videoWidth / v.videoHeight : im ? im.naturalWidth / im.naturalHeight : NaN),
        size: () => (v ? [v.videoWidth, v.videoHeight] : im ? [im.naturalWidth, im.naturalHeight] : null),
      }
      applied.current = { input: mediaTexture, source: mediaTexture }
    } else {
      const size = 256
      const data = new Uint8Array(size * size * 4)
      for (let i = 0; i < size * size * 4; i += 4) {
        data[i] = 20
        data[i + 1] = 20
        data[i + 2] = 20
        data[i + 3] = 255
      }
      const placeholder = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      placeholder.needsUpdate = true
      pipeline.setInputTexture(placeholder)
      pipeline.setVideoSize(size, size)
      warpBase.current = { input: placeholder, source: null, live: null, aspect: () => 1, size: () => null }
      applied.current = { input: placeholder, source: null }
    }
  }, [pipeline, mediaTexture, videoElement, imageElement])

  // HDR detection: read the video's transfer from its first decoded frame
  // (until a frame can be read the render loop retries every 15 frames)
  useEffect(() => {
    hdrInfo.current = videoElement ? detectHdr(videoElement) : null
  }, [videoElement])

  // Update video aspect ratio for layout
  useEffect(() => {
    const setAspect = useMediaStore.getState().setVideoAspect

    if (videoElement) {
      const updateAspect = () => {
        if (videoElement.videoWidth && videoElement.videoHeight) {
          setAspect(videoElement.videoWidth / videoElement.videoHeight)
        }
      }
      // Try immediately (dimensions may already be available)
      updateAspect()
      // Also listen for metadata load in case dimensions aren't ready yet
      videoElement.addEventListener('loadedmetadata', updateAspect)
      return () => {
        videoElement.removeEventListener('loadedmetadata', updateAspect)
      }
    } else if (imageElement && imageElement.naturalWidth && imageElement.naturalHeight) {
      setAspect(imageElement.naturalWidth / imageElement.naturalHeight)
    } else {
      setAspect(null)
    }
  }, [videoElement, imageElement])

  // Handle preview time - seek video when hovering thumbnails
  useEffect(() => {
    if (!videoElement || previewTime === null) return

    // Seek video to preview time
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      videoElement.currentTime = previewTime
    }
  }, [videoElement, previewTime])

  // Handle resize and render loop
  useEffect(() => {
    if (!pipeline || !renderer || !containerRef.current) return

    const container = containerRef.current

    // Resizing reallocates every render target and wipes the trails of temporal
    // effects, so a drag resizes once it settles; meanwhile the canvas is
    // stretched to the container.
    let sizeW = 0
    let sizeH = 0
    let resizeTimer = 0
    const updateSize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === sizeW && h === sizeH) return
      sizeW = w
      sizeH = h
      // The performance tier caps the drawing buffer's long side (Mobile: 720 device px); never above 2x.
      // While recording it is at least the tier's recordLongSide (720p), so a small stage never means a small video.
      const lim = tierLimits()
      const longest = Math.max(1, w, h)
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      let pr = Number.isFinite(lim.renderLongSide) ? Math.max(0.25, Math.min(ratio, lim.renderLongSide / longest)) : ratio
      if (usePerfTierStore.getState().recording) pr = Math.max(pr, lim.recordLongSide / longest)
      renderer.setPixelRatio(pr)
      pipeline.setSize(w, h) // also sizes the renderer
      // Update resolution for GPU effects that need it
      pipeline.dotsEffect?.setResolution(w, h)
      pipeline.asciiEffect?.setResolution(w, h)
      pipeline.edgeDetection?.setResolution(w, h)
      pipeline.pixelate?.setResolution(w, h)
      pipeline.edgeTrace?.setResolution(w, h)
      pipeline.halation?.setResolution(w, h)
      pipeline.anamorphic?.setResolution(w, h)
      pipeline.dreamcore?.setResolution(w, h)
    }

    updateSize()
    // A tier change resizes at once (the drawing buffer's cap moves)
    const unsubTier = usePerfTierStore.subscribe((st, prev) => { if (st.tier !== prev.tier || st.recording !== prev.recording) { sizeW = sizeH = -1; updateSize() } })

    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth === sizeW && container.clientHeight === sizeH) return
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(updateSize, 150)
    })
    resizeObserver.observe(container)

    // Video time warp, on the source before the effect chain or (placement 'after') on the finished picture
    // as the chain's last pass. When it is off nothing here allocates or draws.
    // Reused every frame: no per-frame allocation while the warp runs.
    const warpInit = useWarpStore.getState()
    // One playhead object, refilled each frame (no per-frame allocation)
    const play: PlayParams = { direction: 'fwd', start: 0, end: 1, scatter: 0, skew: 0, slices: 16, seed: WARP_SEED }
    const warpOpts: WarpVideoOptions = { profile: 'clean', knobs: warpInit.profileParams.clean, output: warpInit.output, mix: 1, loopSeconds: 2, lut: null, amount: 1, skew: 0, play }
    /** Capture `live` into the ring and return the warped picture (or `live` itself when nothing would change it). */
    const runWarp = (live: THREE.Texture, aspect: number): THREE.Texture => {
      const w = useWarpStore.getState()
      let comp = warpCompositor.current
      if (!comp) { comp = new WarpCompositor(renderer); warpCompositor.current = comp; setActiveWarpCompositor(comp) }
      const lim = tierLimits()
      comp.setFrameLimits(lim.warpLongSide, lim.warpMaxFrames)
      const now = warpNow()
      const loop = warpLoopSecondsAt(now)
      const pos = getHeardWarpPosition()
      play.direction = w.direction; play.start = w.loopStart; play.end = w.loopEnd; play.scatter = w.scatter
      play.skew = w.skew; play.slices = slicesFor(w.snap)
      // Store references (no copies): the compositor reads them during render only
      warpOpts.profile = w.profile; warpOpts.knobs = w.profileParams[w.profile]; warpOpts.output = w.output
      warpOpts.mix = w.mix; warpOpts.loopSeconds = loop
      warpOpts.lut = w.lut; warpOpts.amount = w.amount; warpOpts.skew = w.skew
      comp.setOptions(warpOpts)
      comp.capture(live, now, aspect)
      return comp.render(pos, delayAtX(w.lut, playPosition(pos, play), w.amount, loop))
    }
    const canvasAspect = () => {
      const c = renderer.domElement
      return c.height > 0 ? c.width / c.height : 16 / 9
    }
    const postPass = new WarpPostPass((live) => runWarp(live, canvasAspect()))

    // Slicer: runs on the media picture before the warp; while it shows, its picture is the base.
    // Nothing is built until it is first turned on or its panel opens.
    const slicerBase: WarpBase = {
      input: null as unknown as THREE.Texture, source: null, live: null,
      aspect: () => slicerEngine.current?.aspect ?? NaN,
      size: () => { const s = slicerEngine.current?.outputSize; return s && s[0] ? s : null },
    }
    // HDR source: one conversion pass, before the slicer and the warp, so everything downstream sees SDR
    const hdrPass = new HdrToSdrPass()
    let hdrUsed = false
    const hdrBase: WarpBase = { input: null as unknown as THREE.Texture, source: null, live: null, aspect: () => NaN, size: () => null }
    let hdrRetry = 0
    const sourceTick = (): WarpBase | null => {
      const media = warpBase.current
      const v = useMediaStore.getState().videoElement
      if (hdrInfo.current === undefined && v && ++hdrRetry % 15 === 0) hdrInfo.current = detectHdr(v)
      const hdr = hdrInfo.current
      const size = media?.size()
      if (!media?.live || !hdr || !size) {
        if (hdrUsed) { hdrPass.release(); hdrUsed = false }
        return media
      }
      hdrUsed = true
      const tex = hdrPass.render(renderer, media.live, size[0], size[1], hdr.transfer, hdr.bt2020)
      hdrBase.input = tex
      hdrBase.source = tex
      hdrBase.live = tex
      hdrBase.aspect = media.aspect
      hdrBase.size = media.size
      return hdrBase
    }

    let slicerShown = false
    const slicerTick = (media: WarpBase | null): WarpBase | null => {
      const st = useSlicerStore.getState()
      let eng = slicerEngine.current
      if (!eng) {
        if (!st.enabled && slicerViewers() === 0) return null
        eng = new SlicerEngine()
        slicerEngine.current = eng
      }
      const lim = tierLimits()
      eng.ring.setLimits(lim.slicerLongSide, lim.slicerMaxFrames)
      const seq = useEffectSequencerStore.getState()
      const out = eng.tick(
        renderer, media?.live ?? null, media?.aspect() ?? NaN, media?.size() ?? null,
        performance.now(), st, seq.bpm, getTransportBeats(), seq.isPlaying,
      )
      if (!out) return null
      slicerBase.input = out
      slicerBase.source = out
      slicerBase.live = out
      return slicerBase
    }
    /** Size the chain and the person mask for whichever picture is the base, once per switch. */
    const setShown = (shown: boolean, base: WarpBase | null) => {
      if (shown === slicerShown) return
      slicerShown = shown
      const size = base?.size() ?? [256, 256]
      pipeline.setVideoSize(size[0], size[1])
      pipeline.setSourceVideoSize(size[0], size[1])
      // The slicer's frame is not the live frame: a mask of the live video would be misaligned
      const m = useMediaStore.getState()
      pipeline.segmentation.setSource(shown ? null : (m.videoElement ?? m.imageElement ?? null))
      pipeline.detection.setSource(shown ? null : (m.videoElement ?? m.imageElement ?? null))
    }

    const warpTick = () => {
      const w = useWarpStore.getState()
      const media = sourceTick()
      const sliced = slicerTick(media)
      const base = sliced ?? media
      setShown(!!sliced, base)
      const live = base?.live ?? null
      const on = !!(base && live && w.enabled && w.appliesTo !== 'audio')
      const after = on && w.placement === 'after'
      // The end-of-chain pass is in the chain only while the warp runs after it
      pipeline.setWarpPostPass(after ? postPass : null)
      if (!after) postPass.release()
      let input = base?.input ?? null
      let source = base?.source ?? null
      if (on && !after && base && live) {
        input = source = runWarp(live, base.aspect())
      } else if (!after) {
        // Off: free the render targets (programs are kept)
        const comp = warpCompositor.current
        if (comp && (comp.targetCount || comp.extraTargetCount)) comp.release()
      }
      const a = applied.current
      if (input && (input !== a.input || source !== a.source)) {
        pipeline.setInputTexture(input)
        pipeline.setSourceTexture(source)
        applied.current = { input, source }
      }
    }
    if (import.meta.env.DEV) {
      // Test hook (dev only; stripped from the build). Plain functions, not getters.
      ;(window as unknown as { __warpTest?: unknown }).__warpTest = {
        compositor: () => warpCompositor.current, renderer, THREE, WarpCompositor,
        input: () => applied.current.input ?? warpBase.current?.input ?? null,
        // what the pipeline itself holds as its input, and the original (unwarped) texture
        pipelineInput: () => (pipeline as unknown as { inputTexture: THREE.Texture | null }).inputTexture,
        baseInput: () => warpBase.current?.input ?? null,
        hdr: () => hdrInfo.current,
        setHdr: (v: { transfer: HdrTransfer; bt2020: boolean } | null) => { hdrInfo.current = v },
        postPass: () => postPass,
        // the passes the composer runs (the warp's end pass is last while placement is 'after')
        composerPasses: () => (pipeline as unknown as { composer: { passes: unknown[] } }).composer.passes,
      }
      ;(window as unknown as { __slicerTest?: unknown }).__slicerTest = {
        engine: () => slicerEngine.current, readout: slicerReadout, commands: slicerCommands,
      }
    }

    // A tier with an fps cap (Mobile: 30) skips display frames; 4 ms of slack keeps 60 and 120 Hz displays at a steady 30
    let lastDraw = -Infinity
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      const cap = tierLimits().fps
      const now = performance.now()
      if (cap > 0 && now - lastDraw < 1000 / cap - 4) return
      lastDraw = now
      advanceReadbackFrame()
      const start = performance.now()
      try {
        warpTick()
        pipeline.render()
      } catch (e) {
        // Prevent render errors (e.g. tainted texture) from crashing the loop
        console.warn('Render error:', e)
      }
      perfMonitor.record(performance.now() - start)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      unsubTier()
      resizeObserver.disconnect()
      window.clearTimeout(resizeTimer)
      slicerEngine.current?.dispose()
      slicerEngine.current = null
      hdrPass.dispose()
      pipeline.setWarpPostPass(null)
      postPass.dispose()
      warpCompositor.current?.dispose()
      warpCompositor.current = null
      setActiveWarpCompositor(null)
      applied.current = { input: null, source: null }
    }
  }, [pipeline, renderer, frameIdRef])

  // Use unified source from mediaStore
  const { source } = useMediaStore()
  // An imported or frozen slicer buffer plays without any source
  const hasMedia = source !== 'none' || (slicerEnabled && slicerHasOwnFrames)

  // Source change: the warp and slicer rings must never show frames from the previous source
  useEffect(() => {
    warpCompositor.current?.clear()
    if (useSlicerStore.getState().captureState === 'live') slicerCommands.clear = true
  }, [videoElement, imageElement, source])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black relative"
      data-video-canvas-container
    >
      {/* Empty state when no media loaded — powered-on instrument at rest */}
      {!hasMedia && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Ambient scanline sweep so the panel reads as live telemetry */}
          <div className="surface-scanline" style={{ opacity: 0.5 }} />
          <h1
            className="text-xs font-light tracking-[0.25em] select-none alive-idle"
            style={{
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            SEG_F4ULT.SYS
          </h1>
          <p
            className="mt-2 text-[10px] tracking-wider flex items-center gap-1.5"
            style={{ color: '#bbb', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span style={{ color: 'var(--text-ghost)' }}>&gt;</span>
            Load media to begin
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: '0.5em',
                height: '1em',
                background: '#bbb',
                verticalAlign: '-0.12em',
                animation: 'hud-typewriter-cursor 1.1s step-end infinite',
              }}
            />
          </p>
        </div>
      )}
      {/* Vision effect overlays */}
      <OverlayContainer containerRef={containerRef} glCanvas={renderer?.domElement ?? null} />
    </div>
  )
})
