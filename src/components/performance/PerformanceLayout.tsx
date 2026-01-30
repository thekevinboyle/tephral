import { useRef, useEffect, useState } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { XYPad } from './XYPad'
import { MixControls } from './MixControls'
import { ClipBin } from './ClipBin'
import { ClipDetailModal } from './ClipDetailModal'
import { ExpandedParameterPanel } from './ExpandedParameterPanel'
import { SequencerPanel } from '../sequencer/SequencerPanel'
import { PresetLibraryPanel } from '../presets/PresetLibraryPanel'
import { useRecordingCapture } from '../../hooks/useRecordingCapture'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  // Use state so that when canvas becomes available, it triggers a re-render
  // which allows useRecordingCapture to properly initialize
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // Initialize automation playback (handles keyboard shortcuts and event replay)
  useAutomationPlayback()

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
        {/* Left sidebar: Preset Library + Info Panel */}
        <div
          className="flex-shrink-0"
          style={{
            width: '280px',
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <PresetLibraryPanel canvasRef={captureRef} />
        </div>

        {/* Canvas area (center) */}
        <div
          className="relative flex-1 min-w-0 flex flex-col"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          {/* Canvas */}
          <div className="flex-1 min-h-0 relative">
            <Canvas ref={canvasRef} />
            {/* Clip bin at bottom of preview */}
            <ClipBin />
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

        {/* Expanded Parameter Panel (right) */}
        <div className="flex-shrink-0" style={{ width: '340px' }}>
          <ExpandedParameterPanel />
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
        {/* Column 1: Banks + Button grid (unified container) */}
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

        {/* Column 2: Sequencer */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            flex: '1.5',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <SequencerPanel />
        </div>

        {/* Column 3: XY Pad + Mix Controls */}
        <div className="flex flex-col gap-3" style={{ flex: '0.7' }}>
          {/* XY Pad */}
          <div
            className="flex-1 rounded-xl overflow-hidden relative"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <XYPad />
          </div>

          {/* Mix Controls */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden"
            style={{
              height: '80px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <MixControls />
          </div>
        </div>
      </div>

      {/* Clip detail modal */}
      <ClipDetailModal />
    </div>
  )
}
