import { useEffect, useRef } from 'react'
import { useClipStore } from '../../stores/clipStore'

interface ClipBinPopoverProps {
  onClose: () => void
  anchorRect: DOMRect | null
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function ClipBinPopover({ onClose, anchorRect }: ClipBinPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const clips = useClipStore((state) => state.clips)
  const selectClip = useClipStore((state) => state.selectClip)
  const removeClip = useClipStore((state) => state.removeClip)
  const clearAllClips = useClipStore((state) => state.clearAllClips)

  // Handle click outside (but not during drag)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if we're dragging
      if (isDraggingRef.current) return
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Use mouseup instead of mousedown to allow drag to start
    document.addEventListener('mouseup', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mouseup', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Calculate position
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
  }

  if (anchorRect) {
    style.left = anchorRect.right + 8
    style.top = anchorRect.top
  }

  const handleClipClick = (clipId: string) => {
    selectClip(clipId)
    onClose()
  }

  const handleClearAll = () => {
    if (confirm('Clear all clips?')) {
      clearAllClips()
      onClose()
    }
  }

  return (
    <div
      ref={popoverRef}
      className="rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        ...style,
        width: '240px',
        maxHeight: '300px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Clip list */}
      <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="p-2 hover:bg-white/10 cursor-grab active:cursor-grabbing transition-colors group relative"
            draggable
            onDragStart={(e) => {
              isDraggingRef.current = true
              e.dataTransfer.setData('application/x-clip-id', clip.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onDragEnd={() => {
              isDraggingRef.current = false
              onClose() // Close popover after drag completes
            }}
            onClick={() => handleClipClick(clip.id)}
          >
            {/* Thumbnail */}
            <div className="relative rounded overflow-hidden" style={{ width: '100px', height: '56px' }}>
              <img
                src={clip.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              {/* Duration badge */}
              <div
                className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] tabular-nums"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: '#fff',
                }}
              >
                {formatDuration(clip.duration)}
              </div>
            </div>

            {/* Time ago + drag hint */}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {formatTimeAgo(clip.createdAt)}
              </span>
              <span className="text-[9px] opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                drag to slicer
              </span>
            </div>

            {/* Delete button */}
            <button
              className="absolute top-2 right-2 w-4 h-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'var(--accent)' }}
              onClick={(e) => {
                e.stopPropagation()
                removeClip(clip.id)
              }}
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Clear all button */}
      <div
        className="p-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          className="w-full py-1 rounded-sm text-[10px] transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
          onClick={handleClearAll}
        >
          Clear All
        </button>
      </div>
    </div>
  )
}
