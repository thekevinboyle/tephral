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
import { Crosshair } from './ui/MicroVisuals'
import { perfMonitor } from '../utils/perfMonitor'
import { initParamSync } from '../effects/paramSync'
import { advanceReadbackFrame } from './overlays/sharedReadback'

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
      bypassActive,
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

        return
      }
    }

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
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      advanceReadbackFrame()
      const start = performance.now()
      try {
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
    }
  }, [pipeline, renderer, frameIdRef])

  // Use unified source from mediaStore
  const { source } = useMediaStore()
  const hasMedia = source !== 'none'

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
          <div className="mb-5 opacity-40" style={{ animation: 'hud-reticle-spin 24s linear infinite' }}>
            <Crosshair value={0.5} size={96} />
          </div>
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
