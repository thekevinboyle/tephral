import { useRecordingStore } from '../../stores/recordingStore'
import { useMediaStore } from '../../stores/mediaStore'

export function TransportControls() {
  const {
    isRecording,
    isPreviewing,
    duration,
    events,
    startRecording,
    stopRecording,
    startPreview,
    stopPreview,
    clearRecording,
    exportAutomation,
  } = useRecordingStore()

  const { videoElement, imageElement, source } = useMediaStore()
  const hasSource = videoElement || imageElement

  // Format time as MM:SS.mm
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handleExport = () => {
    const data = exportAutomation()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `automation-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-base-dark border-b border-border">
      {/* Source indicator */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] uppercase text-muted">SRC</span>
        <span className="text-xs text-base-light uppercase">
          {source === 'none' ? 'NONE' : source}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : () => startRecording()}
        disabled={!hasSource}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all
          ${isRecording
            ? 'bg-record-red'
            : hasSource
              ? 'bg-border hover:bg-record-red/50'
              : 'bg-border/50 cursor-not-allowed'
          }
        `}
        style={{
          animation: isRecording ? 'recording-pulse 1.5s ease-in-out infinite' : 'none'
        }}
      >
        <div className={`w-3 h-3 ${isRecording ? 'bg-base-light' : 'bg-record-red'} rounded-full`} />
      </button>

      {/* Timecode */}
      <div className="font-mono text-lg tabular-nums text-base-light min-w-[100px]">
        {formatTime(duration)}
      </div>

      {/* Event count */}
      <div className="text-xs text-muted">
        {events.length} events
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Playback controls */}
      {duration > 0 && (
        <>
          <button
            onClick={isPreviewing ? stopPreview : startPreview}
            className="px-3 py-1 text-xs uppercase border border-border hover:border-base-light text-muted hover:text-base-light transition-colors"
          >
            {isPreviewing ? 'STOP' : 'PLAY'}
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs uppercase border border-accent-yellow text-accent-yellow hover:bg-accent-yellow hover:text-base-dark transition-colors"
          >
            EXPORT
          </button>

          <button
            onClick={clearRecording}
            className="px-3 py-1 text-xs uppercase text-muted hover:text-record-red transition-colors"
          >
            CLEAR
          </button>
        </>
      )}
    </div>
  )
}
