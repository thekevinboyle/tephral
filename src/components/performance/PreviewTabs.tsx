import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewTabs() {
  const { previewMode, setPreviewMode, recordedVideoUrl, play, stop, seek } = useRecordingStore()

  // Has recording if we have a recorded video blob
  const hasRecording = !!recordedVideoUrl

  const handleSourceClick = () => {
    if (previewMode === 'source') return
    stop()
    setPreviewMode('source')
  }

  const handleRecordedClick = () => {
    if (previewMode === 'recorded' || !hasRecording) return
    stop()
    seek(0)
    setPreviewMode('recorded')
    // Small delay to ensure state is set before play
    setTimeout(() => play(), 50)
  }

  return (
    <div
      className="absolute top-3 left-3 flex gap-0.5 rounded-lg p-0.5 z-20"
      style={{
        backgroundColor: '#f5f5f5',
        border: '1px solid #d0d0d0',
      }}
    >
      <button
        onClick={handleSourceClick}
        className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'source' ? '#ffffff' : 'transparent',
          color: previewMode === 'source' ? '#333333' : '#888888',
          boxShadow: previewMode === 'source' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        Source
      </button>
      <button
        onClick={handleRecordedClick}
        disabled={!hasRecording}
        className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'recorded' ? '#ffffff' : 'transparent',
          color: previewMode === 'recorded' ? '#333333' : hasRecording ? '#888888' : '#bbbbbb',
          boxShadow: previewMode === 'recorded' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          cursor: hasRecording ? 'pointer' : 'not-allowed',
        }}
      >
        Recorded
      </button>
    </div>
  )
}
