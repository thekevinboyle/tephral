import { useEffect, useState } from 'react'
import { AsciiRenderOverlay } from './AsciiRenderOverlay'
import { StippleOverlay } from './StippleOverlay'
import { ContourOverlay } from './ContourOverlay'
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

      {/* Contour tracking overlay renders on top */}
      <ContourOverlay width={dimensions.width} height={dimensions.height} glCanvas={glCanvas} />
    </>
  )
}
