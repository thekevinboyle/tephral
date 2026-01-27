import { useEffect, useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function TransportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { source, reset, videoElement, setVideoElement, setImageElement, setSource } = useMediaStore()
  const {
    isRecording,
    currentTime,
    duration,
    startRecording,
    stopRecording,
    setCurrentTime,
    addThumbnail,
    setSource: setRecordingSource,
  } = useRecordingStore()

  const hasSource = source !== 'none'

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
    <div className="h-full flex items-center gap-3 px-4">
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="h-7 px-3 text-[11px] font-medium rounded transition-colors"
        style={{
          backgroundColor: source === 'webcam' ? '#333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'webcam' ? '#fff' : '#666',
        }}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-3 text-[11px] font-medium rounded transition-colors"
        style={{
          backgroundColor: source === 'file' ? '#333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'file' ? '#fff' : '#666',
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

      {/* Clear button */}
      {hasSource && (
        <button
          onClick={reset}
          className="h-7 px-3 text-[11px] font-medium rounded transition-colors"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            color: '#666',
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
