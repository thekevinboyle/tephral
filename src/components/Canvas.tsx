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
import { useSlicerBufferStore } from '../stores/slicerBufferStore'
import { SlicerCompositor } from '../effects/SlicerCompositor'
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

/**
 * What the pipeline is fed without the warp (set by the input effect). `live` is the texture the
 * warp captures (media texture, or the slicer output when the slicer drives the input); null with
 * no media, so the warp is inactive on the placeholder.
 */
interface WarpBase {
  input: THREE.Texture
  source: THREE.Texture | null
  live: THREE.Texture | null
  aspect: () => number
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

  // Slicer state
  const {
    enabled: slicerEnabled,
    outputMode: slicerOutputMode,
    wet: slicerWet,
    blendMode: slicerBlendMode,
    opacity: slicerOpacity,
    processEffects: slicerProcessEffects,
  } = useSlicerStore()

  // Slicer output frame
  const slicerOutputFrame = useSlicerBufferStore((state) => state.currentOutputFrame)

  // Slicer compositor ref
  const slicerCompositor = useRef<SlicerCompositor | null>(null)

  // Video time warp: driven from the rAF loop, never from React state
  const warpBase = useRef<WarpBase | null>(null)
  const warpCompositor = useRef<WarpCompositor | null>(null)
  const warpApplied = useRef<THREE.Texture | null>(null) // texture the loop last pushed; null = base in place

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

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Param sync: direct store→uniform writes, outside the React render cycle
  useEffect(() => {
    if (!pipeline) return
    return initParamSync(pipeline)
  }, [pipeline])

  // Initialize slicer compositor
  useEffect(() => {
    if (!slicerCompositor.current) {
      slicerCompositor.current = new SlicerCompositor()
    }
    slicerCompositor.current.updateParams({
      mode: slicerOutputMode,
      wet: slicerWet,
      blendMode: slicerBlendMode,
      opacity: slicerOpacity,
    })
  }, [slicerOutputMode, slicerWet, slicerBlendMode, slicerOpacity])

  // Update slicer compositor with output frame and original for mixing
  useEffect(() => {
    if (slicerCompositor.current && slicerOutputFrame) {
      slicerCompositor.current.setSlicerFrame(slicerOutputFrame)

      // For mix/layer modes, capture original video frame
      if (slicerOutputMode !== 'replace' && videoElement) {
        // Create canvas to capture current video frame
        const canvas = document.createElement('canvas')
        canvas.width = slicerOutputFrame.width
        canvas.height = slicerOutputFrame.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
          const originalFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
          slicerCompositor.current.setOriginalFrame(originalFrame)
        }
      }
    }
  }, [slicerOutputFrame, slicerOutputMode, videoElement])

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
      segWanted: segVoxelEnabled || segEchoEnabled || segMatterEnabled,
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

    // Apply trace masks to glitch effects
    const applyTraceMask = (effectId: string) => {
      const maskSource = effectTraceMask[effectId]
      if (!maskSource || maskSource === 'none') return null
      return pipeline.getTraceMask(maskSource)
    }

    // Apply masks to supported effects
    const rgbMask = applyTraceMask('rgb_split')
    if (pipeline.rgbSplit) {
      pipeline.rgbSplit.setTraceMask(rgbMask)
    }

    const blockMask = applyTraceMask('block_displace')
    if (pipeline.blockDisplace) {
      pipeline.blockDisplace.setTraceMask(blockMask)
    }

    const datamoshMask = applyTraceMask('datamosh')
    if (pipeline.datamosh) {
      pipeline.datamosh.setTraceMask(datamoshMask)
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
    segVoxelEnabled, segEchoEnabled, segMatterEnabled, segStaleEnabled, segTornEnabled,
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

    // Check if slicer should provide the texture (even without media source)
    if (slicerEnabled && slicerCompositor.current) {
      const slicerTexture = slicerCompositor.current.getOutputTexture()
      if (slicerTexture) {
        pipeline.setInputTexture(slicerTexture)
        // Also set as source texture so crossfader SRC shows raw slicer output
        // (not the camera/file which may not exist)
        pipeline.setSourceTexture(slicerTexture)
        // Use the slicer texture's actual dimensions for proper aspect ratio
        // The slicer outputs at 480x270 (16:9) regardless of source
        const texWidth = (slicerTexture as THREE.DataTexture).image?.width || 480
        const texHeight = (slicerTexture as THREE.DataTexture).image?.height || 270
        pipeline.setVideoSize(texWidth, texHeight)
        pipeline.setSourceVideoSize(texWidth, texHeight)
        // The slicer frame isn't the video frame — a mask of the video would be misaligned
        pipeline.segmentation.setSource(null)
        warpBase.current = { input: slicerTexture, source: slicerTexture, live: slicerTexture, aspect: () => texWidth / texHeight }
        warpApplied.current = null

        return
      }
    }

    // Person segmentation follows the active source (video or still image).
    // Known limitation: with the video warp on, the mask still follows the live element, not the warped frame.
    pipeline.segmentation.setSource(videoElement ?? imageElement ?? null)

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
      }
      warpApplied.current = null
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
      warpBase.current = { input: placeholder, source: null, live: null, aspect: () => 1 }
      warpApplied.current = null
    }
  }, [pipeline, mediaTexture, videoElement, imageElement, slicerEnabled, slicerOutputMode, slicerOutputFrame])

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

    const updateSize = () => {
      pipeline.setSize(container.clientWidth, container.clientHeight)
      renderer.setSize(container.clientWidth, container.clientHeight)
      // Update resolution for GPU effects that need it
      pipeline.dotsEffect?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.asciiEffect?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.edgeDetection?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.pixelate?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.edgeTrace?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.halation?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.anamorphic?.setResolution(container.clientWidth, container.clientHeight)
      pipeline.dreamcore?.setResolution(container.clientWidth, container.clientHeight)
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
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
    const warpTick = () => {
      const w = useWarpStore.getState()
      const base = warpBase.current
      const live = base?.live ?? null
      const on = !!(base && live && w.enabled && w.appliesTo !== 'audio')
      const after = on && w.placement === 'after'
      // The end-of-chain pass is in the chain only while the warp runs after it
      pipeline.setWarpPostPass(after ? postPass : null)
      if (!after) postPass.release()
      if (on && !after && base && live) {
        const out = runWarp(live, base.aspect())
        if (out !== warpApplied.current) {
          pipeline.setInputTexture(out)
          pipeline.setSourceTexture(out)
          warpApplied.current = out
        }
        return
      }
      // Off, after the chain, or no source: put the base back exactly once
      if (warpApplied.current && base) {
        pipeline.setInputTexture(base.input)
        pipeline.setSourceTexture(base.source)
      }
      warpApplied.current = null
      if (after) return
      // Off: free the render targets (programs are kept)
      const comp = warpCompositor.current
      if (comp && (comp.targetCount || comp.extraTargetCount)) comp.release()
    }
    if (import.meta.env.DEV) {
      // Test hook (dev only; stripped from the build). Plain functions, not getters.
      ;(window as unknown as { __warpTest?: unknown }).__warpTest = {
        compositor: () => warpCompositor.current, renderer, THREE, WarpCompositor,
        input: () => warpApplied.current ?? warpBase.current?.input ?? null,
        // what the pipeline itself holds as its input, and the original (unwarped) texture
        pipelineInput: () => (pipeline as unknown as { inputTexture: THREE.Texture | null }).inputTexture,
        baseInput: () => warpBase.current?.input ?? null,
        postPass: () => postPass,
        // the passes the composer runs (the warp's end pass is last while placement is 'after')
        composerPasses: () => (pipeline as unknown as { composer: { passes: unknown[] } }).composer.passes,
      }
    }

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
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
      resizeObserver.disconnect()
      slicerCompositor.current?.dispose()
      pipeline.setWarpPostPass(null)
      postPass.dispose()
      warpCompositor.current?.dispose()
      warpCompositor.current = null
      setActiveWarpCompositor(null)
      warpApplied.current = null
    }
  }, [pipeline, renderer, frameIdRef])

  // Use unified source from mediaStore
  const { source } = useMediaStore()
  const hasMedia = source !== 'none'

  // Source change: the warp ring must never show frames from the previous source
  useEffect(() => {
    warpCompositor.current?.clear()
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
