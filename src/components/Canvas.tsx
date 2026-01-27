import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { useVideoTexture } from '../hooks/useVideoTexture'
import { EffectPipeline } from '../effects/EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMediaStore } from '../stores/mediaStore'
import { useRoutingStore } from '../stores/routingStore'
import { useRecordingStore } from '../stores/recordingStore'
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

  // Expose canvas element via ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => renderer?.domElement ?? null
  }), [renderer])

  const {
    enabled: glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    noiseEnabled,
    pixelateEnabled,
    edgeDetectionEnabled,
    rgbSplit,
    blockDisplace,
    scanLines,
    noise,
    pixelate,
    edgeDetection,
    wetMix,
    bypassActive,
    effectBypassed,
    soloEffectId,
  } = useGlitchEngineStore()

  // Solo filtering: when soloing, only the soloed effect passes through
  const isSoloing = soloEffectId !== null
  const getEffectiveEnabled = (effectId: string, actualEnabled: boolean) => {
    if (!isSoloing) return actualEnabled
    return soloEffectId === effectId && actualEnabled
  }

  const { effectOrder } = useRoutingStore()

  // Initialize pipeline
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Sync effect parameters
  useEffect(() => {
    if (!pipeline) return

    pipeline.rgbSplit?.updateParams(rgbSplit)
    pipeline.blockDisplace?.updateParams(blockDisplace)
    pipeline.scanLines?.updateParams(scanLines)
    pipeline.noise?.updateParams(noise)
    pipeline.pixelate?.updateParams(pixelate)
    pipeline.edgeDetection?.updateParams(edgeDetection)

    pipeline.updateEffects({
      effectOrder,
      rgbSplitEnabled: getEffectiveEnabled('rgb_split', glitchEnabled && rgbSplitEnabled && !effectBypassed['rgb_split']),
      blockDisplaceEnabled: getEffectiveEnabled('block_displace', glitchEnabled && blockDisplaceEnabled && !effectBypassed['block_displace']),
      scanLinesEnabled: getEffectiveEnabled('scan_lines', glitchEnabled && scanLinesEnabled && !effectBypassed['scan_lines']),
      noiseEnabled: getEffectiveEnabled('noise', glitchEnabled && noiseEnabled && !effectBypassed['noise']),
      pixelateEnabled: getEffectiveEnabled('pixelate', glitchEnabled && pixelateEnabled && !effectBypassed['pixelate']),
      edgeDetectionEnabled: getEffectiveEnabled('edges', glitchEnabled && edgeDetectionEnabled && !effectBypassed['edges']),
      wetMix,
      bypassActive,
    })
  }, [
    pipeline,
    glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    noiseEnabled,
    pixelateEnabled,
    edgeDetectionEnabled,
    rgbSplit,
    blockDisplace,
    scanLines,
    noise,
    pixelate,
    edgeDetection,
    effectOrder,
    wetMix,
    bypassActive,
    effectBypassed,
    soloEffectId,
  ])

  // Update input texture and video dimensions
  useEffect(() => {
    if (!pipeline) return

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
  }, [pipeline, mediaTexture, videoElement, imageElement])

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
    }
  }, [pipeline, renderer, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black relative"
    >
      {/* Vision effect overlays */}
      <OverlayContainer containerRef={containerRef} glCanvas={renderer?.domElement ?? null} />
    </div>
  )
})
