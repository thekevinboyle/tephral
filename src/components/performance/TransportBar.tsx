import { useEffect } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function TransportBar() {
  const { source, reset, videoElement } = useMediaStore()
  const {
    isRecording,
    currentTime,
    duration,
    startRecording,
    stopRecording,
    setCurrentTime,
    addThumbnail,
  } = useRecordingStore()

  const hasSource = source !== 'none'

  // Format time as MM:SS.mm
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Recording timer
  useEffect(() => {
    if (!isRecording) return

    const startTime = performance.now()
    let thumbnailInterval: number

    const updateTime = () => {
      const elapsed = (performance.now() - startTime) / 1000
      setCurrentTime(elapsed)
    }

    const captureInterval = setInterval(updateTime, 100)

    // Capture thumbnails every 2 seconds
    if (videoElement) {
      thumbnailInterval = window.setInterval(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, 64, 64)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
          const time = (performance.now() - startTime) / 1000
          addThumbnail({ time, dataUrl })
        }
      }, 2000)
    }

    return () => {
      clearInterval(captureInterval)
      if (thumbnailInterval) clearInterval(thumbnailInterval)
    }
  }, [isRecording, setCurrentTime, addThumbnail, videoElement])

  return (
    <div className="h-full flex items-center gap-4 px-4">
      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!hasSource}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? '#ef4444' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          boxShadow: isRecording ? '0 0 10px #ef4444' : 'none',
          opacity: hasSource ? 1 : 0.5,
          cursor: hasSource ? 'pointer' : 'not-allowed',
        }}
      >
        <div
          className={`${isRecording ? 'w-2.5 h-2.5 rounded-sm' : 'w-3 h-3 rounded-full'}`}
          style={{
            backgroundColor: isRecording ? '#ffffff' : '#ef4444',
          }}
        />
      </button>

      {/* Timecode */}
      <span
        className="text-[14px] tabular-nums"
        style={{
          color: '#444444',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {formatTime(isRecording ? currentTime : duration)}
      </span>

      {/* Clear button */}
      {hasSource && (
        <button
          onClick={reset}
          className="text-[13px] font-medium transition-colors hover:text-gray-900"
          style={{ color: '#666666' }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
