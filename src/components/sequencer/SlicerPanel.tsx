import { useState, useCallback } from 'react'
import { SlicerTransport } from './SlicerTransport'
import { SlicerWaveform } from './SlicerWaveform'
import { SlicerControls } from './SlicerControls'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'
import { useClipStore } from '../../stores/clipStore'
import { useSlicerPlayback } from '../../hooks/useSlicerPlayback'

export function SlicerPanel() {
  const { setCaptureState, setImportedClipId } = useSlicerStore()
  const { importFrames } = useSlicerBufferStore()
  const { clips } = useClipStore()

  // Initialize the slicer playback engine
  useSlicerPlayback()

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const hasClipId = e.dataTransfer.types.includes('application/x-clip-id')
    if (hasClipId && !isDragOver) {
      console.log('[SlicerPanel] Drag over detected')
      setIsDragOver(true)
    }
  }, [isDragOver])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const clipId = e.dataTransfer.getData('application/x-clip-id')
    if (!clipId) return

    const clip = clips.find(c => c.id === clipId)
    if (!clip || clip.frames.length === 0) return

    // Instant - frames already extracted
    importFrames(clip.frames)
    setCaptureState('imported')
    setImportedClipId(clipId)
  }, [clips, importFrames, setCaptureState, setImportedClipId])

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            border: '2px dashed #8b5cf6',
          }}
        >
          <span className="text-lg font-medium" style={{ color: '#8b5cf6' }}>
            Drop to import
          </span>
        </div>
      )}

      {/* Header row */}
      <div
        className="px-3 py-2 flex items-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          SLICER
        </span>
        <div className="flex-1" />
        <SlicerTransport />
      </div>

      {/* Waveform area */}
      <div
        className="shrink-0"
        style={{
          height: '35%',
          minHeight: '80px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <SlicerWaveform />
      </div>

      {/* Controls area */}
      <div className="flex-1 overflow-y-auto">
        <SlicerControls />
      </div>
    </div>
  )
}
