import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PreviewTabs() {
  const { previewMode, setPreviewMode, duration, play, stop, seek } = useRecordingStore()
  const { resetEffects } = useAutomationPlayback()

  const hasRecording = duration > 0

  const handleSourceClick = () => {
    if (previewMode === 'source') return
    stop()
    setPreviewMode('source')
  }

  const handleRecordedClick = () => {
    if (previewMode === 'recorded' || !hasRecording) return
    stop()
    resetEffects()
    seek(0)
    setPreviewMode('recorded')
    // Small delay to ensure state is set before play
    setTimeout(() => play(), 50)
  }

  return (
    <div
      className="absolute top-3 left-3 flex gap-1 rounded-full px-1 py-1 z-20"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        onClick={handleSourceClick}
        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'source' ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: previewMode === 'source' ? '#ffffff' : '#888888',
        }}
      >
        Source
      </button>
      <button
        onClick={handleRecordedClick}
        disabled={!hasRecording}
        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'recorded' ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: previewMode === 'recorded' ? '#ffffff' : hasRecording ? '#888888' : '#555555',
          opacity: hasRecording ? 1 : 0.5,
          cursor: hasRecording ? 'pointer' : 'not-allowed',
        }}
      >
        Recorded
      </button>
    </div>
  )
}
