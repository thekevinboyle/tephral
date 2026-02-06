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
            className="flex flex-col items-center justify-center rounded-sm"
            style={{
              width: cardWidth,
              height: cardHeight,
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--accent)',
              boxShadow: '0 0 8px var(--accent-glow)',
            }}
          >
            <div
              className="text-[9px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--accent)' }}
            >
              Importing
            </div>
            <div
              className="text-[11px] font-mono font-bold"
              style={{ color: 'var(--accent)' }}
            >
              {importProgress}%
            </div>
            {/* Progress bar */}
            <div
              className="mt-1 rounded-sm overflow-hidden"
              style={{
                width: '50px',
                height: '2px',
                backgroundColor: 'var(--border)',
              }}
            >
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${importProgress}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
          </div>
        )}

        {/* Import button - shown when no clips and not importing */}
        {clips.length === 0 && !isImporting && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center rounded-sm cursor-pointer transition-all hover:scale-105"
            style={{
              width: cardWidth,
              height: cardHeight,
              backgroundColor: 'var(--bg-surface)',
              border: '1px dashed var(--border)',
            }}
            title="Import video clip"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-ghost)"
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
            className="absolute inset-0 flex items-center justify-center rounded-sm pointer-events-none"
            style={{
              backgroundColor: 'rgba(255, 0, 85, 0.15)',
              border: '1px dashed var(--accent)',
              zIndex: 100,
            }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Drop
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
                className="absolute flex items-center justify-center rounded-sm text-[9px] font-medium"
                style={{
                  width: 16,
                  height: 16,
                  right: -4,
                  top: -4,
                  backgroundColor: 'var(--accent)',
                  color: 'var(--text-primary)',
                  zIndex: maxVisibleCards + 1,
                  boxShadow: '0 0 4px var(--accent-glow)',
                }}
              >
                +{extraCount}
              </div>
            )}

            {/* Hover glow effect */}
            <div
              className="absolute inset-0 rounded-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                boxShadow: '0 0 12px var(--accent-glow)',
              }}
            />

            {/* Add button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="absolute flex items-center justify-center rounded-sm transition-all hover:scale-110"
              style={{
                width: 16,
                height: 16,
                right: -6,
                bottom: -6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                zIndex: maxVisibleCards + 2,
              }}
              title="Add video clip"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-ghost)"
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
