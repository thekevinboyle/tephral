import { useRef, useCallback, useEffect } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { TransportBar } from './TransportBar'
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
import { SlideDrawer } from '../ui/SlideDrawer'
import { DrawerTrigger } from '../ui/DrawerTrigger'
import { useCanvasCapture } from '../../hooks/useCanvasCapture'
import { useRecordingStore, type ExportFormat, type ExportQuality } from '../../stores/recordingStore'
import { useUIStore } from '../../stores/uiStore'
import { useDrawerShortcuts } from '../../hooks/useDrawerShortcuts'

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

  // Drawer state for responsive panels
  const {
    leftDrawerOpen,
    rightDrawerOpen,
    setLeftDrawerOpen,
    setRightDrawerOpen,
    toggleLeftDrawer,
    toggleRightDrawer,
  } = useUIStore()

  useDrawerShortcuts()

  // Close drawers when resizing back to large breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setLeftDrawerOpen(false)
        setRightDrawerOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setLeftDrawerOpen, setRightDrawerOpen])

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
      style={{ backgroundColor: '#e5e5e5', minWidth: '1024px' }}
    >
      {/* Preview section (55vh) - 3 columns: Left placeholder, Canvas, Parameters */}
      <div
        className="flex-shrink-0 m-3 mb-0 flex rounded-xl overflow-hidden"
        style={{
          height: 'calc(55vh - 12px)',
          border: '1px solid #d0d0d0',
        }}
      >
        {/* Preset Library Panel - visible on xl, drawer on smaller */}
        <div
          className="flex-shrink-0 hidden xl:block"
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
          {/* Drawer triggers - visible only when panels are hidden */}
          <div className="xl:hidden">
            <DrawerTrigger side="left" onClick={toggleLeftDrawer} icon="folder" />
          </div>
          <div className="xl:hidden">
            <DrawerTrigger side="right" onClick={toggleRightDrawer} icon="sliders" />
          </div>

          {/* Slide-out drawers */}
          <SlideDrawer open={leftDrawerOpen} onClose={() => setLeftDrawerOpen(false)} side="left">
            <PresetLibraryPanel canvasRef={captureRef} />
          </SlideDrawer>
          <SlideDrawer open={rightDrawerOpen} onClose={() => setRightDrawerOpen(false)} side="right">
            <ExpandedParameterPanel />
          </SlideDrawer>

          {/* Canvas */}
          <div className="w-full h-full">
            <Canvas ref={canvasRef} />
          </div>

          {/* Thumbnail filmstrip at bottom of preview */}
          <ThumbnailFilmstrip />
        </div>

        {/* Expanded Parameter Panel - visible on xl, drawer on smaller */}
        <div className="flex-shrink-0 hidden xl:block" style={{ width: '340px' }}>
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

      {/* Bottom section - 3 columns with min-widths */}
      <div
        className="flex-1 min-h-0 flex mx-3 mt-3 mb-3 gap-3 overflow-x-auto"
      >
        {/* Column 1: Banks + Button grid (unified container) */}
        <div
          className="min-h-0 flex flex-col rounded-xl overflow-hidden"
          style={{
            flex: '1 1 280px',
            minWidth: '280px',
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
            flex: '1.5 1 200px',
            minWidth: '200px',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
          }}
        >
          <SequencerPanel />
        </div>

        {/* Column 3: XY Pad + Mix Controls */}
        <div
          className="flex flex-col gap-3"
          style={{
            flex: '0.8 1 180px',
            minWidth: '180px',
          }}
        >
          {/* XY Pad - maintains square aspect */}
          <div
            className="flex-1 rounded-xl overflow-hidden relative flex items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d0d0d0',
            }}
          >
            <div className="w-full h-full" style={{ aspectRatio: '1', maxHeight: '100%', maxWidth: '100%' }}>
              <XYPad />
            </div>
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
