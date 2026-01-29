import { useEffect, useState } from 'react'
import { AsciiRenderOverlay } from './AsciiRenderOverlay'
import { StippleOverlay } from './StippleOverlay'
import { VisionTrackingOverlay } from './VisionTrackingOverlay'
import { AcidOverlay } from './AcidOverlay'
import { TextureOverlay } from './TextureOverlay'
import { DataOverlay } from './DataOverlay'
import { StrandOverlay } from './StrandOverlay'
import { useLandmarkDetection } from '../../hooks/useLandmarkDetection'

interface OverlayContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  glCanvas: HTMLCanvasElement | null
}

export function OverlayContainer({ containerRef, glCanvas }: OverlayContainerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

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

  return (
    <>
      {/* Stipple renders first (replaces background) */}
      <StippleOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* ASCII renders on top of stipple or original */}
      <AsciiRenderOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Vision tracking overlay renders on top */}
      <VisionTrackingOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Acid effects overlay (renders after vision tracking) */}
      <AcidOverlay sourceCanvas={glCanvas} width={dimensions.width} height={dimensions.height} />

      {/* Texture overlay (film grain, dust, etc.) */}
      <TextureOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />

      {/* Data overlay (text, watermarks) - always renders last so text is never obscured */}
      <DataOverlay width={dimensions.width} height={dimensions.height} />

      {/* Strand effects overlay */}
      <StrandOverlay sourceCanvas={glCanvas} width={dimensions.width} height={dimensions.height} />
    </>
  )
}
