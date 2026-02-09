import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { ClipBin } from './ClipBin'
import { ClipDetailModal } from './ClipDetailModal'
import { ExpandedParameterPanel } from './ExpandedParameterPanel'
import { EffectsLane } from './EffectsLane'
import { MiddleSection } from './MiddleSection'
import { ModulationLane } from './ModulationLane'
import { ModulationLines } from './ModulationLines'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { DataTerminal } from '../terminal/DataTerminal'
// import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { useRecordingCapture } from '../../hooks/useRecordingCapture'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useContinuousModulation } from '../../hooks/useContinuousModulation'
import { useEuclideanEngine } from '../../hooks/useEuclideanEngine'
import { useRicochetEngine } from '../../hooks/useRicochetEngine'
import { useModulationEngine } from '../../hooks/useModulationEngine'
import { useMediaStore } from '../../stores/mediaStore'
// InfoPanel kept for future use
// import { InfoPanel } from '../panels/InfoPanel'

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

  // Initialize sequencer engines (always running)
  useEuclideanEngine()
  useRicochetEngine()

  // Initialize modulation engine (LFO, Random, Step, Envelope value generators)
  useModulationEngine()

  // Initialize continuous modulation for special sources (euclidean, ricochet, lfo, random, step, envelope)
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
      className="w-screen h-screen overflow-hidden grid-substrate"
      style={{
        display: 'grid',
        gridTemplateRows: '1fr auto 1fr',
        gridTemplateColumns: 'var(--col-left) 1fr var(--col-right)',
        gap: 'var(--gap)',
        padding: 'var(--gap)',
      }}
    >
      {/* Left Column: Parameter Panel (row 1), Crossfader (row 2), Effects Grid (row 3) */}

      {/* Row 1, Col 1: Effect Info Panel */}
      <div
        className="rounded-sm overflow-hidden panel-gradient-subtle"
        style={{
          gridRow: 1,
          gridColumn: 1,
          border: '1px solid var(--border)',
        }}
      >
        <ExpandedParameterPanel />
      </div>

      {/* Row 2, Col 1: Crossfader Section */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          gridRow: 2,
          gridColumn: 1,
          minHeight: 'var(--row-middle)',
          border: '1px solid var(--border)',
        }}
      >
        <MiddleSection />
      </div>

      {/* Row 3, Col 1: Effects Grid */}
      <div
        className="flex flex-col rounded-sm overflow-hidden panel-gradient"
        style={{
          gridRow: 3,
          gridColumn: 1,
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

      {/* Center Column: Canvas + Slicer + ModLane (spans all 3 rows) */}
      <div
        className="flex flex-col rounded-sm overflow-hidden"
        style={{
          gridRow: '1 / 4',
          gridColumn: 2,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        {/* Canvas area */}
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

        {/* Transport bar */}
        <div
          className="flex-shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <TransportBar />
        </div>

        {/* Slicer panel */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            height: '180px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <SequencerContainer />
        </div>

        {/* Modulation lane at the bottom */}
        <div
          className="flex-shrink-0"
          style={{
            height: '72px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <ModulationLane />
        </div>
      </div>

      {/* Right Column: EffectsLane + DataTerminal (spans all 3 rows) */}
      <div
        className="flex flex-col rounded-sm overflow-hidden"
        style={{
          gridRow: '1 / 4',
          gridColumn: 3,
          border: '1px solid var(--border)',
        }}
      >
        {/* Effects Lane */}
        <div className="flex-1 min-h-0 overflow-hidden panel-gradient-subtle">
          <EffectsLane />
        </div>

        {/* Data Terminal */}
        <div
          className="flex-shrink-0 overflow-hidden panel-gradient-accent"
          style={{
            height: '200px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <DataTerminal />
        </div>
      </div>

      {/* Clip detail modal */}
      <ClipDetailModal />

      {/* Modulation connection lines overlay */}
      <ModulationLines />
    </div>
  )
}
