import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { VerticalCrossfader } from './VerticalCrossfader'
import { ClipBin } from './ClipBin'
import { ClipDetailModal } from './ClipDetailModal'
import { ExpandedParameterPanel } from './ExpandedParameterPanel'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { SequencerPanel } from '../sequencer/SequencerPanel'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { useRecordingCapture } from '../../hooks/useRecordingCapture'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useContinuousModulation } from '../../hooks/useContinuousModulation'
import { useMediaStore } from '../../stores/mediaStore'
import { InfoPanel } from '../panels/InfoPanel'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  // Use state so that when canvas becomes available, it triggers a re-render
  // which allows useRecordingCapture to properly initialize
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // Track video dimensions for dynamic sizing
  const { videoElement, imageElement, source } = useMediaStore()
  const [videoAspect, setVideoAspect] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Initialize automation playback (handles keyboard shortcuts and event replay)
  useAutomationPlayback()

  // Initialize continuous modulation for special sources (euclidean, ricochet)
  useContinuousModulation()

  // Create a ref object that useRecordingCapture can use
  const captureRef = useRef<HTMLCanvasElement | null>(null)

  // Keep captureRef in sync with the canvas element
  useEffect(() => {
    const checkCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current.getCanvas()
        if (canvas && canvas !== captureRef.current) {
          captureRef.current = canvas
          setCanvasElement(canvas) // Trigger re-render when canvas is found
        }
      }
    }
    // Check immediately and also on a short interval until we get it
    checkCanvas()
    const interval = setInterval(checkCanvas, 100)
    return () => clearInterval(interval)
  }, [])

  // Track video/image aspect ratio
  useEffect(() => {
    if (videoElement) {
      const updateAspect = () => {
        if (videoElement.videoWidth && videoElement.videoHeight) {
          setVideoAspect(videoElement.videoWidth / videoElement.videoHeight)
        }
      }
      updateAspect()
      videoElement.addEventListener('loadedmetadata', updateAspect)
      return () => videoElement.removeEventListener('loadedmetadata', updateAspect)
    } else if (imageElement) {
      if (imageElement.naturalWidth && imageElement.naturalHeight) {
        setVideoAspect(imageElement.naturalWidth / imageElement.naturalHeight)
      }
    } else {
      setVideoAspect(null)
    }
  }, [videoElement, imageElement])

  // Track container size
  const updateContainerSize = useCallback(() => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect()
      setContainerWidth(rect.width)
      setContainerHeight(rect.height)
    }
  }, [])

  useEffect(() => {
    updateContainerSize()
    window.addEventListener('resize', updateContainerSize)
    return () => window.removeEventListener('resize', updateContainerSize)
  }, [updateContainerSize])

  // Calculate if we need side placeholders
  const hasMedia = source !== 'none'
  const containerAspect = containerHeight > 0 ? containerWidth / containerHeight : 16/9
  const showSidePlaceholders = hasMedia && videoAspect !== null && videoAspect < containerAspect

  // Calculate the width the video actually needs
  const videoWidth = showSidePlaceholders && videoAspect
    ? Math.floor(containerHeight * videoAspect)
    : containerWidth
  const sideWidth = showSidePlaceholders ? Math.floor((containerWidth - videoWidth) / 2) : 0

  // Use recording capture hook - captures canvas during recording
  // Pass canvasElement as a dependency hint so hook re-runs when canvas is available
  useRecordingCapture(captureRef, canvasElement)

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Preview section (55vh) - 3 columns: Left placeholder, Canvas, Parameters */}
      <div
        className="flex-shrink-0 m-3 mb-0 flex rounded-xl overflow-hidden"
        style={{
          height: 'calc(55vh - 12px)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Left sidebar: Expanded Parameter Panel */}
        <div className="flex-shrink-0" style={{ width: '340px' }}>
          <ExpandedParameterPanel />
        </div>

        {/* Canvas area (center) */}
        <div
          className="relative flex-1 min-w-0 flex flex-col"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          {/* Canvas with side placeholders */}
          <div ref={canvasContainerRef} className="flex-1 min-h-0 relative flex">
            {/* Left placeholder */}
            {showSidePlaceholders && sideWidth > 40 && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: sideWidth,
                  backgroundColor: '#1e3a5f',
                  borderRight: '1px solid var(--border)',
                }}
              />
            )}

            {/* Canvas */}
            <div className="flex-1 min-w-0 relative">
              <Canvas ref={canvasRef} />
              {/* Clip bin always floats in bottom left corner */}
              <ClipBin />
            </div>

            {/* Right placeholder */}
            {showSidePlaceholders && sideWidth > 40 && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: sideWidth,
                  backgroundColor: '#1e3a5f',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                <span
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                >
                  {/* Empty placeholder */}
                </span>
              </div>
            )}
          </div>

          {/* Transport bar at bottom of preview */}
          <div
            className="flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <TransportBar />
          </div>
        </div>

        {/* Right sidebar: Preset Dropdown Bar + Info Panel */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{
            width: '220px',
            backgroundColor: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <PresetDropdownBar canvasRef={captureRef} />
          {/* Info Panel fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <InfoPanel />
          </div>
        </div>
      </div>

      {/* Parameter strip */}
      <div
        className="flex-shrink-0 mx-3 mt-3 rounded-xl overflow-hidden"
        style={{
          height: '8vh',
          minHeight: '60px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        <ParameterPanel />
      </div>

      {/* Bottom section - 3 equal columns */}
      <div
        className="flex-1 min-h-0 flex mx-3 mt-3 mb-3 gap-3"
      >
        {/* Column 1: Banks + Button grid + Vertical Crossfader */}
        <div className="flex-1 min-h-0 flex gap-3">
          {/* Grid container */}
          <div
            className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Bank row header */}
            <div
              className="flex-shrink-0"
              style={{
                height: '52px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <BankPanel />
            </div>
            {/* Grid */}
            <div className="flex-1 min-h-0">
              <PerformanceGrid />
            </div>
          </div>
          {/* Crossfader container */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <VerticalCrossfader />
          </div>
        </div>

        {/* Column 2: Sequencer */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            flex: '1.5',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <SequencerContainer />
        </div>

        {/* Column 3: Step Sequencer */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            flex: '0.8',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <SequencerPanel />
        </div>
      </div>

      {/* Clip detail modal */}
      <ClipDetailModal />
    </div>
  )
}
