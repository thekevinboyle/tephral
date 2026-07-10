import { useEffect, useState } from 'react'
import { AsciiRenderOverlay } from './AsciiRenderOverlay'
import { StippleOverlay } from './StippleOverlay'
import { VisionTrackingOverlay } from './VisionTrackingOverlay'
import { ContourOverlay } from './ContourOverlay'
import { LandmarksOverlay } from './LandmarksOverlay'
import { AcidOverlay } from './AcidOverlay'
import { TextureOverlay } from './TextureOverlay'
import { DataOverlay } from './DataOverlay'
import { useLandmarkDetection } from '../../hooks/useLandmarkDetection'
import { useRoutingStore } from '../../stores/routingStore'

interface OverlayContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  glCanvas: HTMLCanvasElement | null
}

export function OverlayContainer({ containerRef, glCanvas }: OverlayContainerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const crossfaderPosition = useRoutingStore((s) => s.crossfaderPosition)

  // Initialize detection hooks
  useLandmarkDetection()

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  // Crossfader at 0 = fully dry (no effects), at 1 = fully processed
  // Fade overlays with crossfader since they render outside the WebGL pipeline
  const overlayOpacity = crossfaderPosition

  return (
    <div style={{ opacity: overlayOpacity, pointerEvents: overlayOpacity < 0.01 ? 'none' : 'auto' }}>
      {/* Stipple renders first (replaces background) */}
      <StippleOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* ASCII renders on top of stipple or original */}
      <AsciiRenderOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Vision tracking overlay renders on top */}
      <VisionTrackingOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Contour tracking overlay */}
      <ContourOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* ML-based landmarks overlay */}
      <LandmarksOverlay width={dimensions.width} height={dimensions.height} />

      {/* Acid effects overlay (renders after vision tracking) */}
      <AcidOverlay sourceCanvas={glCanvas} width={dimensions.width} height={dimensions.height} />

      {/* Texture overlay (film grain, dust, etc.) */}
      <TextureOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Data overlay (text, watermarks) - always renders last so text is never obscured */}
      <DataOverlay width={dimensions.width} height={dimensions.height} />
    </div>
  )
}
