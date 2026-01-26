import { useEffect, useState } from 'react'
import { DetectionOverlay } from './DetectionOverlay'
import { PointNetworkOverlay } from './PointNetworkOverlay'
import { AsciiRenderOverlay } from './AsciiRenderOverlay'
import { StippleOverlay } from './StippleOverlay'
import { useObjectDetection } from '../../hooks/useObjectDetection'
import { useLandmarkDetection } from '../../hooks/useLandmarkDetection'

interface OverlayContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function OverlayContainer({ containerRef }: OverlayContainerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Initialize detection hooks
  useObjectDetection()
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
      <StippleOverlay width={dimensions.width} height={dimensions.height} />

      {/* ASCII renders on top of stipple or original */}
      <AsciiRenderOverlay width={dimensions.width} height={dimensions.height} />

      {/* Point network draws connecting lines */}
      <PointNetworkOverlay width={dimensions.width} height={dimensions.height} />

      {/* Detection boxes render on top */}
      <DetectionOverlay width={dimensions.width} height={dimensions.height} />
    </>
  )
}
