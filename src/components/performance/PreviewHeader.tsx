import { useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewHeader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setVideoElement, setImageElement, setSource, source } = useMediaStore()
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
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
    >
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
        style={{
          backgroundColor: source === 'webcam' ? '#ffffff' : '#f5f5f5',
          border: source === 'webcam' ? '1px solid #6366f1' : '1px solid #d0d0d0',
          color: source === 'webcam' ? '#6366f1' : '#666666',
        }}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
        style={{
          backgroundColor: source === 'file' ? '#ffffff' : '#f5f5f5',
          border: source === 'file' ? '1px solid #6366f1' : '1px solid #d0d0d0',
          color: source === 'file' ? '#6366f1' : '#666666',
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
    </div>
  )
}
