import { useRef, useCallback } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { PreviewHeader } from './PreviewHeader'
import { SignalPathBar } from './SignalPathBar'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { GraphicPanelV2 } from './GraphicPanelV2'
import { XYPad } from './XYPad'
import { MixControls } from './MixControls'
import { ThumbnailFilmstrip } from './ThumbnailFilmstrip'
import { ExportModal } from './ExportModal'
import { useCanvasCapture } from '../../hooks/useCanvasCapture'
import { useRecordingStore, type ExportFormat, type ExportQuality } from '../../stores/recordingStore'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)

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
  const { startExport, duration, play, stop } = useRecordingStore()

  const handleExport = useCallback((format: ExportFormat, quality: ExportQuality) => {
    updateCaptureRef()
    if (!captureRef.current) {
      console.error('Canvas not available for export')
      return
    }

    startExport()

    // Start playback and capture
    stop() // Reset to beginning
    const started = startCapture({ format, quality })

    if (started) {
      play()
      // Stop capture after duration
      setTimeout(() => {
        stopCapture()
      }, duration * 1000 + 500) // Add 500ms buffer
    }
  }, [updateCaptureRef, startExport, startCapture, stopCapture, play, stop, duration])

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#141414' }}
    >
      {/* Preview section (55vh) - Full width canvas */}
      <div
        className="relative flex-shrink-0 m-3 mb-0 rounded-xl overflow-hidden"
        style={{
          height: 'calc(55vh - 12px)',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        {/* Source selection overlay */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <PreviewHeader />
        </div>

        {/* Canvas */}
        <div className="w-full h-full">
          <Canvas ref={canvasRef} />
        </div>

        {/* Thumbnail filmstrip at bottom of preview */}
        <ThumbnailFilmstrip />
      </div>

      {/* Signal path bar (5vh) */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '5vh',
          minHeight: '32px',
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid #2a2a2a',
        }}
      >
        <SignalPathBar />
      </div>

      {/* Parameter strip (12vh) - horizontal scrollable, draggable */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '12vh',
          minHeight: '80px',
          borderTop: '1px solid #2a2a2a',
        }}
      >
        <ParameterPanel />
      </div>

      {/* Bank panel (~4vh) - preset banks */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '4vh',
          minHeight: '40px',
          borderTop: '1px solid #2a2a2a',
        }}
      >
        <BankPanel />
      </div>

      {/* Bottom section (~24vh) - Button grid + Graphic panel */}
      <div
        className="flex-1 min-h-0 flex mx-3 mb-3 gap-3"
        style={{
          borderTop: '1px solid #2a2a2a',
          paddingTop: '12px',
        }}
      >
        {/* Button grid - 50vw */}
        <PerformanceGrid />

        {/* Right side - Graphic panel + (XY Pad + Mix Controls) */}
        <div className="flex-1 flex gap-3">
          {/* Graphic panel */}
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
            }}
          >
            <GraphicPanelV2 />
          </div>

          {/* XY Pad + Mix Controls column */}
          <div className="flex-1 flex flex-col gap-3">
            {/* XY Pad */}
            <div
              className="flex-1 rounded-xl overflow-hidden relative"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
              }}
            >
              <XYPad />
            </div>

            {/* Mix Controls */}
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{
                height: '80px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
              }}
            >
              <MixControls />
            </div>
          </div>
        </div>
      </div>

      {/* Export modal */}
      <ExportModal onExport={handleExport} isFormatSupported={isFormatSupported} />
    </div>
  )
}
