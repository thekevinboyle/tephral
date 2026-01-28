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
  const timelinePlayheadPercent = duration > 0 ? (displayTime / duration) * 100 : 0

  return (
    <div
      className="absolute bottom-3 left-3 right-3 h-12 flex items-center gap-2 px-3 rounded-lg"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #d0d0d0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Thumbnail frames - fixed width area on left */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {thumbnails.length > 0 ? (
          thumbnails.map((thumb, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-8 w-8 rounded overflow-hidden transition-all duration-150 cursor-pointer"
              style={{
                border: hoveredIndex === i
                  ? '2px solid #6366f1'
                  : '1px solid #d0d0d0',
                boxShadow: hoveredIndex === i
                  ? '0 0 8px rgba(99, 102, 241, 0.4)'
                  : 'none',
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
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-8 w-8 rounded"
              style={{
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              }}
            />
          ))
        ) : null}
      </div>

      {/* Timeline track - aligned with transport bar timeline */}
      <div
        className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden group"
        onClick={handleBarClick}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
          style={{ width: `${timelinePlayheadPercent}%` }}
        />
        {/* Playhead */}
        {duration > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${timelinePlayheadPercent}% - 5px)` }}
          />
        )}
      </div>

      {/* Preview time indicator */}
      {previewTime !== null && (
        <div
          className="text-[11px] tabular-nums flex-shrink-0"
          style={{
            color: '#f97316',
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
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
