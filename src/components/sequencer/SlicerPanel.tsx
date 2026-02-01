import { useState, useCallback } from 'react'
import { SlicerTransport } from './SlicerTransport'
import { SlicerWaveform } from './SlicerWaveform'
import { SlicerControls } from './SlicerControls'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'
import { useClipStore } from '../../stores/clipStore'
import { extractFramesFromClip } from '../../utils/clipFrameExtractor'

export function SlicerPanel() {
  const { setCaptureState, setImportedClipId } = useSlicerStore()
  const { importFrames } = useSlicerBufferStore()
  const { clips } = useClipStore()

  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    console.log('[SlicerPanel] Drop event, types:', e.dataTransfer.types)
    const clipId = e.dataTransfer.getData('application/x-clip-id')
    console.log('[SlicerPanel] Clip ID:', clipId)
    if (!clipId) return

    // Find clip in store
    const clip = clips.find((c) => c.id === clipId)
    console.log('[SlicerPanel] Found clip:', clip)
    if (!clip) return

    setIsImporting(true)
    try {
      const frames = await extractFramesFromClip(clip.url, clip.duration)
      console.log('[SlicerPanel] Got frames:', frames.length)
      importFrames(frames)
      setCaptureState('imported')
      setImportedClipId(clipId)
    } catch (error) {
      console.error('[SlicerPanel] Failed to import clip:', error)
    } finally {
      setIsImporting(false)
    }
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

      {/* Loading overlay */}
      {isImporting && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Importing...
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
