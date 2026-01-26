import { useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewHeader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setVideoElement, setImageElement, setSource, source, reset } = useMediaStore()
  const { setSource: setRecordingSource } = useRecordingStore()

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

      {/* Clear button */}
      {source !== 'none' && (
        <button
          onClick={reset}
          className="text-xs uppercase text-muted hover:text-record-red transition-colors"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
