import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react'
import { useClipStore, type ExportResolution, type ExportQuality, type ExportFrameRate, type ExportFormat } from '../../stores/clipStore'
import { useVideoTranscode } from '../../hooks/useVideoTranscode'

/**
 * Formats seconds to "M:SS" format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ClipDetailModal() {
  // Video ref and local state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)

  // Get clip store state
  const {
    clips,
    selectedClipId,
    selectClip,
    removeClip,
    exportResolution,
    exportQuality,
    exportFrameRate,
    exportFormat,
    setExportResolution,
    setExportQuality,
    setExportFrameRate,
    setExportFormat,
  } = useClipStore()

  // Get transcode hook
  const { transcode, isTranscoding, isLoading, progress, cancel } = useVideoTranscode()

  // Find selected clip
  const selectedClip = clips.find(c => c.id === selectedClipId)

  // Video sync effect
  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedClip) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    // Auto-play on open
    video.play().catch(() => {
      // Autoplay may be blocked by browser
    })

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [selectedClipId, selectedClip])

  // Handlers
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleSeek = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !selectedClip) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    video.currentTime = percentage * selectedClip.duration
  }, [selectedClip])

  const handleExport = useCallback(async () => {
    if (!selectedClip) return

    setExportError(null)
    try {
      const resultBlob = await transcode(selectedClip.blob, {
        resolution: exportResolution,
        quality: exportQuality,
        frameRate: exportFrameRate,
        format: exportFormat,
      })

      // Download result blob
      const url = URL.createObjectURL(resultBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clip-${Date.now()}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.')
    }
  }, [selectedClip, transcode, exportResolution, exportQuality, exportFrameRate, exportFormat])

  const handleDelete = useCallback(() => {
    if (selectedClipId) {
      removeClip(selectedClipId)
    }
  }, [selectedClipId, removeClip])

  const isBusy = isLoading || isTranscoding

  const handleClose = useCallback(() => {
    if (isBusy) {
      // Cancel the operation first, then close
      cancel()
    }
    selectClip(null)
  }, [isBusy, cancel, selectClip])

  // Escape key handler - always works, cancels operation if busy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  // Don't render if no clip is selected
  if (!selectedClip) return null

  const progressPercentage = selectedClip.duration > 0
    ? (currentTime / selectedClip.duration) * 100
    : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-detail-modal-title"
        className="relative rounded-xl p-6 w-full max-w-2xl mx-4"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visually hidden title for screen readers */}
        <h2 id="clip-detail-modal-title" className="sr-only">
          Clip Details
        </h2>

        {/* Close button - always enabled, cancels operation if busy */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            cancel()
            selectClip(null)
          }}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-600"
          style={{
            backgroundColor: '#333',
            color: '#999',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M1 13L13 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Video preview */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={selectedClip.url}
            className="w-full h-full object-contain"
            playsInline
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-4 mb-6">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: '#333',
              color: '#fff',
            }}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3" height="12" rx="1" />
                <rect x="9" y="1" width="3" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M2 1.5V12.5C2 13.1 2.6 13.4 3.1 13.1L12.1 7.6C12.6 7.3 12.6 6.7 12.1 6.4L3.1 0.9C2.6 0.6 2 0.9 2 1.5Z" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div
            className="flex-1 h-2 rounded-full cursor-pointer"
            style={{ backgroundColor: '#333' }}
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: '#3b82f6',
              }}
            />
          </div>

          {/* Time display */}
          <div
            className="text-[13px] tabular-nums whitespace-nowrap"
            style={{ color: '#999', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTime(currentTime)} / {formatTime(selectedClip.duration)}
          </div>
        </div>

        {/* Transcoding progress or export options */}
        {(isLoading || isTranscoding) ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div
                className="flex justify-between text-[14px]"
                style={{ color: '#999' }}
              >
                <span>{isLoading ? 'Loading FFmpeg...' : 'Transcoding...'}</span>
                {!isLoading && (
                  <span
                    className="tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {progress}%
                  </span>
                )}
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: '#333' }}
              >
                {isLoading ? (
                  /* Indeterminate loading bar */
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{
                      width: '30%',
                      backgroundColor: '#3b82f6',
                    }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={() => {
                cancel()
                selectClip(null)
              }}
              className="w-full py-2 text-[14px] font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#333',
                border: '1px solid #444',
                color: '#999',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resolution */}
            <div className="flex items-center gap-4">
              <label
                className="text-[14px] font-medium w-24"
                style={{ color: '#999' }}
              >
                Resolution
              </label>
              <div className="flex gap-2 flex-1">
                {(['hd', '1080p', '4k'] as ExportResolution[]).map((res) => (
                  <button
                    key={res}
                    onClick={() => setExportResolution(res)}
                    className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors uppercase"
                    style={{
                      backgroundColor: exportResolution === res ? '#3b82f6' : '#333',
                      border: exportResolution === res ? '1px solid #3b82f6' : '1px solid #444',
                      color: exportResolution === res ? '#fff' : '#999',
                    }}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div className="flex items-center gap-4">
              <label
                className="text-[14px] font-medium w-24"
                style={{ color: '#999' }}
              >
                Quality
              </label>
              <div className="flex gap-2 flex-1">
                {(['low', 'medium', 'high'] as ExportQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setExportQuality(q)}
                    className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors capitalize"
                    style={{
                      backgroundColor: exportQuality === q ? '#3b82f6' : '#333',
                      border: exportQuality === q ? '1px solid #3b82f6' : '1px solid #444',
                      color: exportQuality === q ? '#fff' : '#999',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate */}
            <div className="flex items-center gap-4">
              <label
                className="text-[14px] font-medium w-24"
                style={{ color: '#999' }}
              >
                Frame Rate
              </label>
              <div className="flex gap-2 flex-1">
                {([30, 60] as ExportFrameRate[]).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setExportFrameRate(fps)}
                    className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors"
                    style={{
                      backgroundColor: exportFrameRate === fps ? '#3b82f6' : '#333',
                      border: exportFrameRate === fps ? '1px solid #3b82f6' : '1px solid #444',
                      color: exportFrameRate === fps ? '#fff' : '#999',
                    }}
                  >
                    {fps} fps
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="flex items-center gap-4">
              <label
                className="text-[14px] font-medium w-24"
                style={{ color: '#999' }}
              >
                Format
              </label>
              <div className="flex gap-2 flex-1">
                {(['webm', 'mp4', 'mov'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors uppercase"
                    style={{
                      backgroundColor: exportFormat === fmt ? '#3b82f6' : '#333',
                      border: exportFormat === fmt ? '1px solid #3b82f6' : '1px solid #444',
                      color: exportFormat === fmt ? '#fff' : '#999',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Export error message */}
            {exportError && (
              <div
                role="alert"
                className="p-3 rounded-md text-[14px]"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                }}
              >
                {exportError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: '#333',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                }}
              >
                Delete
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 text-[14px] font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: '#3b82f6',
                  border: '1px solid #3b82f6',
                  color: '#fff',
                }}
              >
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
