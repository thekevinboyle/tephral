import { useState, useCallback } from 'react'
import { SlicerTransport } from './SlicerTransport'
import { SlicerWaveform } from './SlicerWaveform'
import { SlicerControls } from './SlicerControls'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'
import { useClipStore } from '../../stores/clipStore'
import { useSlicerPlayback } from '../../hooks/useSlicerPlayback'

export function SlicerPanel() {
  const { setCaptureState, setImportedClipId, enabled, setEnabled } = useSlicerStore()
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
    setEnabled(true) // Auto-enable slicer when clip is imported
  }, [clips, importFrames, setCaptureState, setImportedClipId, setEnabled])

  return (
    <div
      className="flex flex-col h-full w-full relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
        transition: 'border-color 0.15s ease',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bypassed overlay - click to enable */}
      {!enabled && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
          }}
          onClick={() => setEnabled(true)}
        >
          <span
            className="text-[14px] font-bold uppercase tracking-widest px-4 py-2 rounded-sm pointer-events-none"
            style={{
              color: '#ef4444',
              backgroundColor: 'var(--bg-primary)',
              border: '2px solid #ef4444',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
            }}
          >
            Bypassed
          </span>
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: 'rgba(255, 0, 85, 0.15)',
            border: '2px dashed var(--accent)',
          }}
        >
          <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Drop to import
          </span>
        </div>
      )}

      {/* Header row */}
      <div
        className="px-3 py-1.5 flex items-center"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: enabled ? 'rgba(255, 0, 85, 0.08)' : 'transparent',
          transition: 'background-color 0.15s ease',
        }}
      >
        {/* Active indicator dot */}
        <div
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{
            backgroundColor: enabled ? 'var(--accent)' : 'var(--text-ghost)',
            boxShadow: enabled ? '0 0 6px var(--accent-glow)' : 'none',
          }}
        />
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: enabled ? 'var(--accent)' : 'var(--text-ghost)' }}
        >
          Slicer
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
          opacity: enabled ? 1 : 0.25,
          transition: 'opacity 0.15s ease',
        }}
      >
        <SlicerWaveform />
      </div>

      {/* Controls area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          opacity: enabled ? 1 : 0.25,
          transition: 'opacity 0.15s ease',
        }}
      >
        <SlicerControls />
      </div>
    </div>
  )
}
