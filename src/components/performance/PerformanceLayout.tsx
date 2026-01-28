import { useRef, useCallback } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
import { PreviewControls } from './PreviewControls'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { XYPad } from './XYPad'
import { MixControls } from './MixControls'
import { ThumbnailFilmstrip } from './ThumbnailFilmstrip'
import { ExportModal } from './ExportModal'
import { ExpandedParameterPanel } from './ExpandedParameterPanel'
import { SequencerPanel } from '../sequencer/SequencerPanel'
import { PresetLibraryPanel } from '../presets/PresetLibraryPanel'
import { useCanvasCapture } from '../../hooks/useCanvasCapture'
import { useRecordingStore, type ExportFormat, type ExportQuality } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)

  // Initialize automation playback (handles keyboard shortcuts and event replay)
  const { resetEffects } = useAutomationPlayback()

  // Get canvas element from the Canvas component
  const getCanvasElement = useCallback(() => {
    if (!canvasElementRef.current && canvasRef.current) {
      canvasElementRef.current = canvasRef.current.getCanvas()
    }
    return canvasElementRef.current
  }, [])

  // Create a ref object that useCanvasCapture can use
  const captureRef = useRef<HTMLCanvasElement | null>(null)

  // Update captureRef when canvas is available
  const updateCaptureRef = useCallback(() => {
    const canvas = getCanvasElement()
    if (canvas) {
      captureRef.current = canvas
    }
  }, [getCanvasElement])

  const { startCapture, stopCapture, isFormatSupported } = useCanvasCapture(captureRef)
  const { startExport, setExportProgress, duration, play, stop } = useRecordingStore()

  const handleExport = useCallback((format: ExportFormat, quality: ExportQuality) => {
    updateCaptureRef()
    if (!captureRef.current) {
      console.error('Canvas not available for export')
      return
    }

    // Reset to beginning and reset all effects
    stop()
    resetEffects()
    startExport()

    // Small delay to ensure state is reset before capture begins
    setTimeout(() => {
      const started = startCapture({
        format,
        quality,
        onProgress: (progress) => setExportProgress(progress),
      })

      if (started) {
        // Start playback - automation will replay automatically
        play()

        // Stop capture after duration (with buffer for encoding)
        setTimeout(() => {
          stopCapture()
          stop()
        }, duration * 1000 + 500)
      }
    }, 100)
  }, [updateCaptureRef, startExport, setExportProgress, startCapture, stopCapture, play, stop, duration, resetEffects])

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#e5e5e5' }}
    >
      {/* Preview section (55vh) - 3 columns: Left placeholder, Canvas, Parameters */}
      <div
        className="flex-shrink-0 m-3 mb-0 flex rounded-xl overflow-hidden"
        style={{
          height: 'calc(55vh - 12px)',
          border: '1px solid #d0d0d0',
        }}
      >
        {/* Preset Library Panel */}
        <div
          className="flex-shrink-0"
          style={{
            width: '280px',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #d0d0d0',
          }}
        >
          <PresetLibraryPanel canvasRef={captureRef} />
        </div>

        {/* Canvas area (center) */}
        <div
          className="relative flex-1 min-w-0"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {/* Canvas */}
          <div className="w-full h-full">
            <Canvas ref={canvasRef} />
          </div>

          {/* Thumbnail filmstrip at bottom of preview */}
          <ThumbnailFilmstrip />
        </div>

        {/* Expanded Parameter Panel (right) */}
        <div className="flex-shrink-0" style={{ width: '340px' }}>
          <ExpandedParameterPanel />
        </div>
      </div>

      {/* Transport bar */}
      <div
        className="flex-shrink-0 mx-3 mt-3 rounded-xl overflow-hidden"
        style={{
          height: '5vh',
          minHeight: '32px',
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
        }}
      >
        <TransportBar />
      </div>

      {/* Preview controls - only shows when recording exists */}
      <div
        className="flex-shrink-0 mx-3 mt-2 rounded-xl overflow-hidden"
        style={{
          minHeight: '40px',
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
        }}
      >
        <PreviewControls />
      </div>

      {/* Parameter strip - horizontal scrollable, draggable */}
      <div
        className="flex-shrink-0 mx-3 mt-3 rounded-xl overflow-hidden"
        style={{
          height: '12vh',
          minHeight: '80px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #d0d0d0',
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
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
          }}
        >
          {/* Bank row header */}
          <div
            className="flex-shrink-0"
            style={{
              height: '52px',
              borderBottom: '1px solid #e5e5e5',
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
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
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
              backgroundColor: '#ffffff',
              border: '1px solid #d0d0d0',
            }}
          >
            <XYPad />
          </div>

          {/* Mix Controls */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden"
            style={{
              height: '80px',
              backgroundColor: '#ffffff',
              border: '1px solid #d0d0d0',
            }}
          >
            <MixControls />
          </div>
        </div>
      </div>

      {/* Export modal */}
      <ExportModal onExport={handleExport} isFormatSupported={isFormatSupported} />
    </div>
  )
}
