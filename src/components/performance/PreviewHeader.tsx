import { useRef, useEffect } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewHeader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setVideoElement, setImageElement, setSource, source, reset, videoElement } = useMediaStore()
  const {
    setSource: setRecordingSource,
    isRecording,
    isPlaying,
    currentTime,
    duration,
    startRecording,
    stopRecording,
    play,
    pause,
    stop,
    setCurrentTime,
    addThumbnail,
    setShowExportModal,
  } = useRecordingStore()

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

  const hasSource = source !== 'none'

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

  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{ backgroundColor: 'rgba(26, 26, 26, 0.9)' }}
    >
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
        style={{
          backgroundColor: source === 'webcam' ? '#2a2a2a' : '#242424',
          border: source === 'webcam' ? '1px solid #ffcc00' : '1px solid #333333',
          color: source === 'webcam' ? '#ffcc00' : '#888888',
        }}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
        style={{
          backgroundColor: source === 'file' ? '#2a2a2a' : '#242424',
          border: source === 'file' ? '1px solid #ffcc00' : '1px solid #333333',
          color: source === 'file' ? '#ffcc00' : '#888888',
        }}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {/* Record button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!hasSource}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: isRecording ? '#ff3333' : hasSource ? '#333333' : '#242424',
            border: '1px solid #444444',
            boxShadow: isRecording ? '0 0 12px #ff3333' : 'none',
            opacity: hasSource ? 1 : 0.5,
            cursor: hasSource ? 'pointer' : 'not-allowed',
          }}
        >
          <div
            className={`${isRecording ? 'w-3 h-3 rounded-sm' : 'w-3 h-3 rounded-full'}`}
            style={{
              backgroundColor: isRecording ? '#ffffff' : '#ff3333',
            }}
          />
        </button>

        {/* Timecode */}
        <div
          className="text-[12px] tabular-nums min-w-[80px]"
          style={{
            color: '#ffffff',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {formatTime(isRecording ? currentTime : duration)}
        </div>

        {/* Play/Stop buttons (when we have a recording) */}
        {duration > 0 && !isRecording && (
          <>
            <button
              onClick={isPlaying ? pause : play}
              className="px-2 py-1 text-[11px] font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#242424',
                border: '1px solid #333333',
                color: '#888888',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={stop}
              className="px-2 py-1 text-[11px] font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#242424',
                border: '1px solid #333333',
                color: '#888888',
              }}
            >
              ■
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1 text-[11px] font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#242424',
                border: '1px solid #ffcc00',
                color: '#ffcc00',
              }}
            >
              Export
            </button>
          </>
        )}
      </div>

      {/* Clear button */}
      {source !== 'none' && (
        <button
          onClick={reset}
          className="text-[11px] font-medium transition-colors ml-2"
          style={{ color: '#888888' }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
