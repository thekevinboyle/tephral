import { useRef, useEffect } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'

/**
 * Overlay that shows the recorded video (with effects baked in) when in recorded preview mode.
 * This replaces the live canvas view with the actual recorded output.
 */
export function RecordedVideoOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const {
    previewMode,
    recordedVideoUrl,
    isPlaying,
    currentTime,
    duration,
    setCurrentTime,
    pause,
  } = useRecordingStore()

  // Sync video playback with store state
  useEffect(() => {
    const video = videoRef.current
    if (!video || !recordedVideoUrl) return

    if (isPlaying && previewMode === 'recorded') {
      video.play().catch(() => {
        // Ignore autoplay errors
      })
    } else {
      video.pause()
    }
  }, [isPlaying, previewMode, recordedVideoUrl])

  // Sync video time with store time when seeking
  useEffect(() => {
    const video = videoRef.current
    if (!video || !recordedVideoUrl || previewMode !== 'recorded') return

    // Only sync if the difference is significant (to avoid feedback loops)
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime
    }
  }, [currentTime, previewMode, recordedVideoUrl])

  // Update store time from video playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !recordedVideoUrl) return

    const handleTimeUpdate = () => {
      if (previewMode === 'recorded' && isPlaying) {
        setCurrentTime(video.currentTime)
      }
    }

    const handleEnded = () => {
      pause()
      setCurrentTime(duration)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [previewMode, isPlaying, setCurrentTime, pause, duration, recordedVideoUrl])

  // Don't render if not in recorded mode or no video
  if (previewMode !== 'recorded' || !recordedVideoUrl) {
    return null
  }

  return (
    <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={recordedVideoUrl}
        className="max-w-full max-h-full object-contain"
        playsInline
        muted
      />
    </div>
  )
}
