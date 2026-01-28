import { useEffect, useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function TransportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { source, reset, videoElement, setVideoElement, setImageElement, setSource } = useMediaStore()
  const {
    isRecording,
    isPlaying,
    currentTime,
    duration,
    startRecording,
    stopRecording,
    setCurrentTime,
    addThumbnail,
    setSource: setRecordingSource,
    play,
    pause,
    stop,
    seek,
    setShowExportModal,
    clearRecording,
  } = useRecordingStore()

  const { resetEffects } = useAutomationPlayback()

  const hasSource = source !== 'none'
  const hasRecording = duration > 0 && !isRecording

  // Handle play with reset
  const handlePlay = () => {
    if (currentTime === 0) {
      resetEffects()
    }
    play()
  }

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekTime = percentage * duration
    seek(seekTime)
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Format time as MM:SS.mm
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // File select handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = url
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.onloadeddata = () => {
        setVideoElement(video)
        setSource('file')
        setRecordingSource('file')
        video.play()
      }
    } else if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      img.onload = () => {
        setImageElement(img)
        setSource('file')
        setRecordingSource('file')
      }
    }
  }

  // Webcam handler
  const handleWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      video.onloadeddata = () => {
        setVideoElement(video)
        setSource('webcam')
        setRecordingSource('webcam')
        video.play()
      }
    } catch (err) {
      console.error('Webcam error:', err)
    }
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
    <div className="h-full flex items-center gap-2 px-3 py-1.5">
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: source === 'webcam' ? '#333333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'webcam' ? '#ffffff' : '#666666',
        }}
        onMouseEnter={(e) => source !== 'webcam' && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => source !== 'webcam' && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: source === 'file' ? '#333333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'file' ? '#ffffff' : '#666666',
        }}
        onMouseEnter={(e) => source !== 'file' && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => source !== 'file' && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        File
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300" />

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

      {/* Clear source button */}
      {hasSource && !hasRecording && (
        <button
          onClick={reset}
          className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            color: '#666666',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8e8e8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        >
          Clear
        </button>
      )}

      {/* Playback controls - only show when recording exists */}
      {hasRecording && (
        <>
          {/* Divider */}
          <div className="w-px h-5 bg-gray-300" />

          {/* Play/Pause button */}
          <button
            onClick={isPlaying ? pause : handlePlay}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#333">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#333">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          {/* Stop button */}
          <button
            onClick={stop}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
            title="Stop (Escape)"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="#333">
              <rect x="2" y="2" width="10" height="10" rx="1" />
            </svg>
          </button>

          {/* Timeline */}
          <div
            className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden group min-w-[100px]"
            onClick={handleTimelineClick}
          >
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>

          {/* Playback timecode */}
          <span
            className="text-[12px] tabular-nums min-w-[100px] text-right"
            style={{
              color: '#666666',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Export button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
            style={{
              backgroundColor: '#3b82f6',
              border: '1px solid #2563eb',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            Export
          </button>

          {/* Clear recording button */}
          <button
            onClick={clearRecording}
            className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
              color: '#666666',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
            title="Clear recording"
          >
            Clear
          </button>
        </>
      )}
    </div>
  )
}
