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
import { useRecordingStore } from '../stores/recordingStore'
import { useSlicerStore } from '../stores/slicerStore'
import { useSlicerBufferStore } from '../stores/slicerBufferStore'
import { SlicerCompositor } from '../effects/SlicerCompositor'
import { OverlayContainer } from './overlays/OverlayContainer'

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

  // Slicer state
  const {
    enabled: slicerEnabled,
    outputMode: slicerOutputMode,
    wet: slicerWet,
    blendMode: slicerBlendMode,
    opacity: slicerOpacity
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
    rgbSplit,
    chromaticAberration,
    posterize,
    colorGrade,
    blockDisplace,
    staticDisplacement,
    pixelate,
    lensDistortion,
    scanLines,
    vhsTracking,
    noise,
    dither,
    edgeDetection,
    feedbackLoop,
    bypassActive,
    effectBypassed,
    soloEffectId,
    effectMix,
  } = useGlitchEngineStore()

  // Motion effects state
  const {
    motionExtractEnabled,
    echoTrailEnabled,
    timeSmearEnabled,
    freezeMaskEnabled,
    motionExtract,
    echoTrail,
    timeSmear,
    freezeMask,
  } = useMotionStore()

  // Vision effects (GPU overlay versions)
  const {
    dotsEnabled,
    dotsParams,
  } = useAcidStore()

  const {
    enabled: asciiEnabled,
    params: asciiParams,
  } = useAsciiRenderStore()

  // Solo filtering: when soloing, only the soloed effect passes through
  const isSoloing = soloEffectId !== null
  const getEffectiveEnabled = (effectId: string, actualEnabled: boolean) => {
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

  // Sync effect parameters with per-effect dry/wet mix
  useEffect(() => {
    if (!pipeline) return

    // Helper to get mix value (defaults to 1 if not set)
    const getMix = (id: string) => effectMix[id] ?? 1

    // Each effect now has a mix uniform for true dry/wet blending
    pipeline.rgbSplit?.updateParams({ ...rgbSplit, mix: getMix('rgb_split') })
    pipeline.chromaticAberration?.updateParams({ ...chromaticAberration, mix: getMix('chromatic') })
    pipeline.posterize?.updateParams({ ...posterize, mix: getMix('posterize') })
    pipeline.colorGrade?.updateParams({ ...colorGrade, mix: getMix('color_grade') })
    pipeline.blockDisplace?.updateParams({ ...blockDisplace, mix: getMix('block_displace') })
    pipeline.staticDisplacement?.updateParams({ ...staticDisplacement, mix: getMix('static_displace') })
    pipeline.pixelate?.updateParams({ ...pixelate, mix: getMix('pixelate') })
    pipeline.lensDistortion?.updateParams({ ...lensDistortion, mix: getMix('lens') })
    pipeline.scanLines?.updateParams({ ...scanLines, mix: getMix('scan_lines') })
    pipeline.vhsTracking?.updateParams({ ...vhsTracking, mix: getMix('vhs') })
    pipeline.noise?.updateParams({ ...noise, mix: getMix('noise') })
    pipeline.dither?.updateParams({ ...dither, mix: getMix('dither') })
    pipeline.edgeDetection?.updateParams({ ...edgeDetection, mix: getMix('edges') })
    pipeline.feedbackLoop?.updateParams({ ...feedbackLoop, mix: getMix('feedback') })

    // Motion effects
    pipeline.motionExtract?.updateParams({ ...motionExtract, mix: getMix('motion_extract') })
    pipeline.echoTrail?.updateParams({ ...echoTrail, mix: getMix('echo_trail') })
    pipeline.timeSmear?.updateParams({ ...timeSmear, mix: getMix('time_smear') })
    pipeline.freezeMask?.updateParams({ ...freezeMask, mix: getMix('freeze_mask') })

    // Vision effects (GPU overlay versions)
    pipeline.dotsEffect?.updateParams({ ...dotsParams, mix: getMix('acid_dots') })
    pipeline.asciiEffect?.updateParams({
      mode: asciiParams.mode === 'matrix' ? 'standard' : asciiParams.mode as 'standard' | 'blocks' | 'braille',
      cellSize: asciiParams.resolution,
      contrast: asciiParams.contrast,
      invert: asciiParams.invert,
      colorMode: asciiParams.colorMode as 'mono' | 'original' | 'gradient',
      monoColor: asciiParams.monoColor,
      gradientEndColor: asciiParams.gradientEnd,
      mix: getMix('ascii'),
    })

    pipeline.updateEffects({
      effectOrder,
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
      bypassActive,
      crossfaderPosition,
      hasSourceTexture: !!mediaTexture && !slicerEnabled,
      videoWidth: videoElement?.videoWidth || imageElement?.naturalWidth || 1,
      videoHeight: videoElement?.videoHeight || imageElement?.naturalHeight || 1,
    })
  }, [
    pipeline,
    glitchEnabled,
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
    rgbSplit,
    chromaticAberration,
    posterize,
    colorGrade,
    blockDisplace,
    staticDisplacement,
    pixelate,
    lensDistortion,
    scanLines,
    vhsTracking,
    noise,
    dither,
    edgeDetection,
    feedbackLoop,
    effectOrder,
    bypassActive,
    crossfaderPosition,
    effectBypassed,
    soloEffectId,
    // Motion effects
    motionExtractEnabled,
    echoTrailEnabled,
    timeSmearEnabled,
    freezeMaskEnabled,
    motionExtract,
    echoTrail,
    timeSmear,
    freezeMask,
    mediaTexture,
    slicerEnabled,
    effectMix,
    // Vision effects
    dotsEnabled,
    dotsParams,
    asciiEnabled,
    asciiParams,
  ])

  // Update input texture and video dimensions
  useEffect(() => {
    if (!pipeline) return

    // Set source texture for crossfader A side
    // Always provide mediaTexture when available - allows crossfading back to source even with slicer active
    if (mediaTexture) {
      pipeline.setSourceTexture(mediaTexture)
    } else {
      pipeline.setSourceTexture(null)
    }

    // Check if slicer should provide the texture (even without media source)
    if (slicerEnabled && slicerCompositor.current) {
      const slicerTexture = slicerCompositor.current.getOutputTexture()
      if (slicerTexture) {
        pipeline.setInputTexture(slicerTexture)
        // Use the slicer texture's actual dimensions for proper aspect ratio
        // The slicer outputs at 480x270 (16:9) regardless of source
        const texWidth = (slicerTexture as THREE.DataTexture).image?.width || 480
        const texHeight = (slicerTexture as THREE.DataTexture).image?.height || 270
        pipeline.setVideoSize(texWidth, texHeight)
        return
      }
    }

    if (mediaTexture) {
      pipeline.setInputTexture(mediaTexture)

      // Get video/image dimensions for aspect ratio
      if (videoElement) {
        pipeline.setVideoSize(videoElement.videoWidth, videoElement.videoHeight)
      } else if (imageElement) {
        pipeline.setVideoSize(imageElement.naturalWidth, imageElement.naturalHeight)
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
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      pipeline.render()
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
    >
      {/* Empty state when no media loaded */}
      {!hasMedia && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <h1
            className="text-4xl font-light tracking-[0.3em] select-none"
            style={{
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            SEG_F4ULT.SYS
          </h1>
          <p
            className="mt-4 text-sm tracking-wider"
            style={{ color: '#bbb' }}
          >
            Load media to begin
          </p>
        </div>
      )}
      {/* Vision effect overlays */}
      <OverlayContainer containerRef={containerRef} glCanvas={renderer?.domElement ?? null} />
    </div>
  )
})
