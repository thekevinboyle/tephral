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

    // Reset file input so the same file can be selected again
    e.target.value = ''

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
      className="flex items-center gap-1.5 px-3 py-1.5"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="px-2 py-1 text-[10px] font-medium rounded-sm transition-colors"
        style={{
          backgroundColor: source === 'webcam' ? 'var(--bg-surface)' : 'var(--bg-surface)',
          border: source === 'webcam' ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: source === 'webcam' ? 'var(--accent)' : 'var(--text-muted)',
          boxShadow: source === 'webcam' ? '0 0 4px var(--accent-glow)' : 'none',
        }}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2 py-1 text-[10px] font-medium rounded-sm transition-colors"
        style={{
          backgroundColor: source === 'file' ? 'var(--bg-surface)' : 'var(--bg-surface)',
          border: source === 'file' ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: source === 'file' ? 'var(--accent)' : 'var(--text-muted)',
          boxShadow: source === 'file' ? '0 0 4px var(--accent-glow)' : 'none',
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
