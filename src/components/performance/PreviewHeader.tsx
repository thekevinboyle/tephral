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
    <div className="flex items-center gap-2 px-4 py-2 bg-base-dark/80 backdrop-blur-sm">
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className={`
          px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors rounded
          ${source === 'webcam'
            ? 'border-accent-yellow text-accent-yellow'
            : 'border-border text-muted hover:text-base-light hover:border-muted'
          }
        `}
      >
        CAM
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`
          px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors rounded
          ${source === 'file'
            ? 'border-accent-yellow text-accent-yellow'
            : 'border-border text-muted hover:text-base-light hover:border-muted'
          }
        `}
      >
        FILE
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
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isRecording
              ? 'bg-record-red'
              : hasSource
                ? 'bg-border hover:bg-record-red/50'
                : 'bg-border/50 cursor-not-allowed opacity-50'
            }
          `}
          style={{
            boxShadow: isRecording ? '0 0 12px #ff3333' : 'none',
          }}
        >
          <div className={`w-3 h-3 ${isRecording ? 'bg-base-light rounded-sm' : 'bg-record-red rounded-full'}`} />
        </button>

        {/* Timecode */}
        <div className="font-mono text-sm tabular-nums text-base-light min-w-[80px]">
          {formatTime(isRecording ? currentTime : duration)}
        </div>

        {/* Play/Stop buttons (when we have a recording) */}
        {duration > 0 && !isRecording && (
          <>
            <button
              onClick={isPlaying ? pause : play}
              className="px-2 py-1 text-xs uppercase border border-border hover:border-base-light text-muted hover:text-base-light transition-colors rounded"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={stop}
              className="px-2 py-1 text-xs uppercase border border-border hover:border-base-light text-muted hover:text-base-light transition-colors rounded"
            >
              ■
            </button>
          </>
        )}
      </div>

      {/* Clear button */}
      {source !== 'none' && (
        <button
          onClick={reset}
          className="text-xs uppercase text-muted hover:text-record-red transition-colors ml-2"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
