import { useRef, useCallback } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'

export function ThumbnailFilmstrip() {
  const {
    thumbnails,
    currentTime,
    duration,
    isRecording,
    isPlaying,
    previewTime,
    setPreviewTime,
    seek,
    pause,
  } = useRecordingStore()

  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Show filmstrip only when we have thumbnails or are recording
  if (thumbnails.length === 0 && !isRecording && duration === 0) return null

  // Calculate time from mouse position
  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current || duration === 0) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    return percentage * duration
  }, [duration])

  // Handle scrub start
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isRecording || duration === 0) return
    e.preventDefault()
    isDragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    // Pause playback while scrubbing
    if (isPlaying) {
      pause()
    }

    const time = getTimeFromPosition(e.clientX)
    seek(time)
    setPreviewTime(time)
  }

  // Handle scrub move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const time = getTimeFromPosition(e.clientX)
    seek(time)
    setPreviewTime(time)
  }

  // Handle scrub end
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Ignore
    }
    setPreviewTime(null)
  }

  // Calculate playhead position
  const displayTime = previewTime !== null ? previewTime : currentTime
  const playheadPercent = duration > 0 ? (displayTime / duration) * 100 : 0

  return (
    <div
      ref={trackRef}
      className="absolute bottom-3 left-3 right-3 h-14 rounded-lg overflow-hidden touch-none select-none"
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        cursor: duration > 0 ? 'ew-resize' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Thumbnail frames filling the width */}
      <div className="absolute inset-0 flex">
        {thumbnails.length > 0 ? (
          thumbnails.map((thumb, i) => (
            <div
              key={i}
              className="h-full flex-1 min-w-0"
              style={{
                backgroundImage: `url(${thumb.dataUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))
        ) : isRecording ? (
          // Recording - show pulsing placeholder
          <div
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <div
              className="w-3 h-3 rounded-full bg-red-500"
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            />
          </div>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
            No recording
          </div>
        )}
      </div>

      {/* Playhead */}
      {duration > 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
          style={{
            left: `${playheadPercent}%`,
            backgroundColor: '#ffffff',
            boxShadow: '0 0 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Playhead handle - top */}
          <div
            className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-b"
            style={{ backgroundColor: '#ffffff' }}
          />
          {/* Playhead handle - bottom */}
          <div
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-t"
            style={{ backgroundColor: '#ffffff' }}
          />
        </div>
      )}

      {/* Time indicator while scrubbing */}
      {previewTime !== null && (
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] tabular-nums"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {formatTime(previewTime)}
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}
