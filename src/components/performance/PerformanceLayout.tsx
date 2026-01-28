import { useRef, useCallback, useEffect } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { XYPad } from './XYPad'
import { MixControls } from './MixControls'
import { ThumbnailFilmstrip } from './ThumbnailFilmstrip'
import { PreviewTabs } from './PreviewTabs'
import { RecordedVideoOverlay } from './RecordedVideoOverlay'
import { ExportModal } from './ExportModal'
import { ExpandedParameterPanel } from './ExpandedParameterPanel'
import { SequencerPanel } from '../sequencer/SequencerPanel'
import { PresetLibraryPanel } from '../presets/PresetLibraryPanel'
import { useRecordingCapture } from '../../hooks/useRecordingCapture'
import { useRecordingStore, type ExportFormat, type ExportQuality } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)

  // Initialize automation playback (handles keyboard shortcuts and event replay)
  useAutomationPlayback()

  // Create a ref object that useRecordingCapture can use
  const captureRef = useRef<HTMLCanvasElement | null>(null)

  // Keep captureRef in sync with the canvas element
  useEffect(() => {
    const checkCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current.getCanvas()
        if (canvas) {
          captureRef.current = canvas
          canvasElementRef.current = canvas
        }
      }
    }
    // Check immediately and also on a short interval until we get it
    checkCanvas()
    const interval = setInterval(checkCanvas, 100)
    return () => clearInterval(interval)
  }, [])

  // Use recording capture hook - captures canvas during recording
  useRecordingCapture(captureRef)

  const { recordedVideoBlob, finishExport } = useRecordingStore()

  // Export handler - now just downloads the already-recorded video
  const handleExport = useCallback((format: ExportFormat, _quality: ExportQuality) => {
    if (!recordedVideoBlob) {
      console.error('No recorded video to export')
      return
    }

    // Create download link for the recorded video
    const url = URL.createObjectURL(recordedVideoBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tephral-export.${format === 'mp4' ? 'mp4' : 'webm'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    finishExport()
    console.log('[Export] Downloaded recorded video')
  }, [recordedVideoBlob, finishExport])

  // Check if export format is supported (webm always supported since we record in webm)
  const isFormatSupported = useCallback((format: ExportFormat) => {
    // We always record in webm, so webm is always supported
    // MP4 would require transcoding which we don't support yet
    return format === 'webm'
  }, [])

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
          className="relative flex-1 min-w-0 flex flex-col"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {/* Canvas */}
          <div className="flex-1 min-h-0 relative">
            <Canvas ref={canvasRef} />
            {/* Recorded video overlay - shows when in recorded mode */}
            <RecordedVideoOverlay />
            {/* Preview mode tabs */}
            <PreviewTabs />
            {/* Thumbnail filmstrip at bottom of preview */}
            <ThumbnailFilmstrip />
          </div>

          {/* Transport bar at bottom of preview */}
          <div
            className="flex-shrink-0"
            style={{
              backgroundColor: '#ffffff',
              borderTop: '1px solid #d0d0d0',
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
