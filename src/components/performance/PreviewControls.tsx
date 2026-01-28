import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PreviewControls() {
  const {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek,
    setShowExportModal,
  } = useRecordingStore()

  const { resetEffects } = useAutomationPlayback()

  // Format time as MM:SS.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekTime = percentage * duration
    seek(seekTime)
  }

  // Handle play with reset
  const handlePlay = () => {
    if (currentTime === 0) {
      resetEffects()
    }
    play()
  }

  if (duration === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 h-full">
      {/* Play/Pause button */}
      <button
        onClick={isPlaying ? pause : handlePlay}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#333">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#333">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      {/* Stop button */}
      <button
        onClick={stop}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        title="Stop (Escape)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#333">
          <rect x="2" y="2" width="10" height="10" rx="1" />
        </svg>
      </button>

      {/* Timeline */}
      <div
        className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden group"
        onClick={handleTimelineClick}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
        {/* Hover highlight */}
        <div className="absolute inset-0 bg-gray-300/0 group-hover:bg-gray-300/30 transition-colors" />
        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Timecode */}
      <div
        className="text-[13px] tabular-nums text-gray-600 min-w-[110px] text-right"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Export button */}
      <button
        onClick={() => setShowExportModal(true)}
        className="px-4 py-1.5 text-[13px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Export Video
      </button>
    </div>
  )
}
