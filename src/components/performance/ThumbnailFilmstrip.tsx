import { useState } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'

export function ThumbnailFilmstrip() {
  const {
    thumbnails,
    currentTime,
    duration,
    isRecording,
    previewTime,
    setPreviewTime,
    seek,
    play,
  } = useRecordingStore()

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Show filmstrip only when we have thumbnails or are recording
  if (thumbnails.length === 0 && !isRecording) return null

  // Handle thumbnail hover - set preview time
  const handleThumbnailEnter = (time: number, index: number) => {
    if (isRecording) return // Disable hover preview during recording
    setPreviewTime(time)
    setHoveredIndex(index)
  }

  const handleThumbnailLeave = () => {
    setPreviewTime(null)
    setHoveredIndex(null)
  }

  // Handle thumbnail click - jump and play
  const handleThumbnailClick = (time: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRecording) return
    seek(time)
    play()
  }

  // Handle click on empty area - seek by position
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    seek(percentage * duration)
    play()
  }

  // Calculate playhead position
  const displayTime = previewTime !== null ? previewTime : currentTime
  const playheadPercent = duration > 0 ? (displayTime / duration) * 100 : 0

  return (
    <div
      className="absolute bottom-3 left-3 right-3 h-12 flex items-center gap-1 px-2 rounded-lg cursor-pointer"
      style={{
        background: 'rgba(10, 12, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      onClick={handleBarClick}
    >
      {/* Thumbnail frames */}
      {thumbnails.length > 0 ? (
        thumbnails.map((thumb, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-8 w-8 rounded overflow-hidden transition-all duration-150"
            style={{
              border: hoveredIndex === i
                ? '2px solid rgba(255, 170, 0, 0.8)'
                : '1px solid rgba(255,255,255,0.2)',
              boxShadow: hoveredIndex === i
                ? '0 0 8px rgba(255, 170, 0, 0.4)'
                : '0 1px 3px rgba(0,0,0,0.3)',
              transform: hoveredIndex === i ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={() => handleThumbnailEnter(thumb.time, i)}
            onMouseLeave={handleThumbnailLeave}
            onClick={(e) => handleThumbnailClick(thumb.time, e)}
          >
            <img
              src={thumb.dataUrl}
              alt={`Frame ${i}`}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        ))
      ) : isRecording ? (
        // Recording placeholder frames
        Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-8 w-8 rounded"
            style={{
              border: '1px solid rgba(255, 51, 51, 0.3)',
              background: 'rgba(255, 51, 51, 0.1)',
            }}
          />
        ))
      ) : null}

      {/* Spacer to fill remaining space */}
      <div className="flex-1" />

      {/* Playhead indicator */}
      {duration > 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
          style={{
            left: `${playheadPercent}%`,
            background: previewTime !== null ? '#ff6600' : '#ffaa00',
            boxShadow: previewTime !== null
              ? '0 0 6px rgba(255, 102, 0, 0.6)'
              : '0 0 4px rgba(255, 170, 0, 0.5)',
          }}
        />
      )}

      {/* Preview time indicator */}
      {previewTime !== null && (
        <div
          className="absolute -top-6 text-[10px] text-accent-yellow tabular-nums pointer-events-none"
          style={{ left: `${playheadPercent}%`, transform: 'translateX(-50%)' }}
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
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
