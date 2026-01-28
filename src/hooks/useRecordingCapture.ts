import { useEffect, useRef } from 'react'
import { useRecordingStore, EXPORT_BITRATES } from '../stores/recordingStore'

/**
 * Hook that captures the canvas to video during recording.
 * When recording starts, it begins capturing the canvas with effects.
 * When recording stops, it saves the video blob to the store.
 */
export function useRecordingCapture(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const {
    isRecording,
    exportQuality,
    setRecordedVideo,
  } = useRecordingStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isRecording) {
      // Start recording
      chunksRef.current = []

      // Get supported mime type
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      let mimeType = ''
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          mimeType = mime
          break
        }
      }

      if (!mimeType) {
        console.error('No supported video mime type found')
        return
      }

      try {
        const stream = canvas.captureStream(30) // 30 FPS
        const bitrate = EXPORT_BITRATES[exportQuality]

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        })

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorderRef.current.onstop = () => {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: mimeType })
            setRecordedVideo(blob)
            console.log('[Recording] Video captured, size:', blob.size)
          }
        }

        mediaRecorderRef.current.start(100) // Collect data every 100ms
        console.log('[Recording] Started capturing canvas')
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err)
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        console.log('[Recording] Stopped capturing')
      }
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording, canvasRef, exportQuality, setRecordedVideo])
}
