import { useState, useRef, useCallback } from 'react'
import { useClipStore } from '../../stores/clipStore'
import { ClipBinPopover } from './ClipBinPopover'
import { extractFramesFromClip } from '../../utils/clipFrameExtractor'

/**
 * Get the duration of a video from its URL
 */
async function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'metadata'
    video.src = url

    video.onloadedmetadata = () => {
      resolve(video.duration)
      video.remove()
    }

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
      video.remove()
    }
  })
}

export function ClipBin() {
  const clips = useClipStore((state) => state.clips)
  const addClip = useClipStore((state) => state.addClip)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [importProgress, setImportProgress] = useState<number | null>(null)

  const handleStackClick = () => {
    // Don't open popover if we just finished dragging
    if (isDragging) {
      setIsDragging(false)
      return
    }
    if (clips.length === 0) return
    if (stackRef.current) {
      setAnchorRect(stackRef.current.getBoundingClientRect())
    }
    setPopoverOpen(true)
  }

  const handleClosePopover = () => {
    setPopoverOpen(false)
  }

  // File import handler
  const handleFileImport = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      console.warn('[ClipBin] Only video files are supported for clip import')
      return
    }

    setImportProgress(0)

    const url = URL.createObjectURL(file)
    try {
      const duration = await getVideoDuration(url)

      // Extract frames with progress
      const frames = await extractFramesFromClip(url, duration, (progress) => {
        setImportProgress(Math.round(progress * 100))
      })

      // Add clip with pre-extracted frames
      await addClip(file, duration, frames)
    } catch (error) {
      console.error('[ClipBin] Failed to import file:', error)
    } finally {
      setImportProgress(null)
      URL.revokeObjectURL(url)
    }
  }, [addClip])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileImport(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFileImport])

  // File drag and drop handlers
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Check if it's a file (not a clip from the bin)
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
      setIsFileDragOver(true)
    }
  }, [])

  const handleFileDragLeave = useCallback(() => {
    setIsFileDragOver(false)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsFileDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) {
      handleFileImport(file)
    }
  }, [handleFileImport])

  // Card dimensions
  const cardWidth = 80
  const cardHeight = 48
  const offsetX = 4
  const offsetY = 6
  const maxVisibleCards = 4

  // Calculate visible clips for stack
  const visibleClips = clips.slice(0, maxVisibleCards)
  const extraCount = clips.length - maxVisibleCards

  // Stack dimensions (including offsets)
  const stackWidth = cardWidth + (Math.min(clips.length, maxVisibleCards) - 1) * offsetX
  const stackHeight = cardHeight + (Math.min(clips.length, maxVisibleCards) - 1) * offsetY

  const isImporting = importProgress !== null

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 20,
        }}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        {/* Import progress overlay */}
        {isImporting && (
          <div
            className="flex flex-col items-center justify-center rounded-lg"
            style={{
              width: cardWidth,
              height: cardHeight,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              className="text-[11px] font-medium"
              style={{ color: '#a78bfa' }}
            >
              Importing...
            </div>
            <div
              className="text-[13px] font-mono font-bold"
              style={{ color: '#c4b5fd' }}
            >
              {importProgress}%
            </div>
            {/* Progress bar */}
            <div
              className="mt-1 rounded-full overflow-hidden"
              style={{
                width: '60px',
                height: '3px',
                backgroundColor: 'rgba(139, 92, 246, 0.3)',
              }}
            >
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${importProgress}%`,
                  backgroundColor: '#8b5cf6',
                }}
              />
            </div>
          </div>
        )}

        {/* Import button - shown when no clips and not importing */}
        {clips.length === 0 && !isImporting && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center rounded-lg cursor-pointer transition-all hover:scale-105"
            style={{
              width: cardWidth,
              height: cardHeight,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
            }}
            title="Import video clip"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {/* File drag overlay */}
        {isFileDragOver && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.3)',
              border: '2px dashed #8b5cf6',
              zIndex: 100,
            }}
          >
            <span className="text-[11px] font-medium" style={{ color: '#c4b5fd' }}>
              Drop video
            </span>
          </div>
        )}

        {/* Stacked cards - shown when there are clips and not importing */}
        {clips.length > 0 && !isImporting && (
          <div
            ref={stackRef}
            className="relative cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
            style={{
              width: stackWidth,
              height: stackHeight,
            }}
            onClick={handleStackClick}
          >
            {visibleClips.map((clip, index) => {
              // Reverse order so first clip is on top
              const reverseIndex = visibleClips.length - 1 - index
              const opacity = 1 - reverseIndex * 0.15

              return (
                <div
                  key={clip.id}
                  className="absolute rounded overflow-hidden cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    console.log('[ClipBin] Drag start, clip:', clip.id)
                    setIsDragging(true)
                    e.dataTransfer.setData('application/x-clip-id', clip.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onDragEnd={() => {
                    // Small delay to prevent click from firing
                    setTimeout(() => setIsDragging(false), 100)
                  }}
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    left: reverseIndex * offsetX,
                    top: reverseIndex * offsetY,
                    opacity,
                    zIndex: visibleClips.length - reverseIndex,
                    boxShadow: reverseIndex === 0
                      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                      : '0 2px 4px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <img
                    src={clip.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                </div>
              )
            })}

            {/* Extra count badge */}
            {extraCount > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full text-[10px] font-medium"
                style={{
                  width: 20,
                  height: 20,
                  right: -6,
                  top: -6,
                  backgroundColor: '#FF6B6B',
                  color: '#fff',
                  zIndex: maxVisibleCards + 1,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              >
                +{extraCount}
              </div>
            )}

            {/* Hover glow effect */}
            <div
              className="absolute inset-0 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)',
              }}
            />

            {/* Add button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="absolute flex items-center justify-center rounded transition-all hover:scale-110"
              style={{
                width: 20,
                height: 20,
                right: -8,
                bottom: -8,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                zIndex: maxVisibleCards + 2,
              }}
              title="Add video clip"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Popover */}
      {popoverOpen && (
        <ClipBinPopover
          onClose={handleClosePopover}
          anchorRect={anchorRect}
        />
      )}
    </>
  )
}
