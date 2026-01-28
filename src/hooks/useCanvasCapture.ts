import { useRef, useCallback } from 'react'
import { useRecordingStore, EXPORT_BITRATES, type ExportFormat, type ExportQuality } from '../stores/recordingStore'

interface CaptureOptions {
  format: ExportFormat
  quality: ExportQuality
  onProgress?: (progress: number) => void
}

// Check if a mime type is supported
function getMimeType(format: ExportFormat): string | null {
  const mimeTypes: Record<ExportFormat, string[]> = {
    webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
    mp4: ['video/mp4;codecs=h264', 'video/mp4'],
  }

  for (const mime of mimeTypes[format]) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return null
}

export function useCanvasCapture(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const progressIntervalRef = useRef<number | null>(null)

  const { finishExport, cancelExport, duration } = useRecordingStore()

  const isFormatSupported = useCallback((format: ExportFormat): boolean => {
    return getMimeType(format) !== null
  }, [])

  const startCapture = useCallback((options: CaptureOptions): boolean => {
    if (!canvasRef.current) {
      console.error('Canvas ref not available')
      return false
    }

    const mimeType = getMimeType(options.format)
    if (!mimeType) {
      console.error(`Format ${options.format} not supported`)
      return false
    }

    const stream = canvasRef.current.captureStream(30) // 30 FPS
    const bitrate = EXPORT_BITRATES[options.quality]

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      })
    } catch (e) {
      console.error('Failed to create MediaRecorder:', e)
      return false
    }

    chunksRef.current = []

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      downloadBlob(blob, options.format)
      finishExport()
    }

    mediaRecorderRef.current.onerror = (e) => {
      console.error('MediaRecorder error:', e)
      cancelExport()
    }

    mediaRecorderRef.current.start(100) // Collect data every 100ms

    // Start progress tracking if callback provided
    if (options.onProgress && duration > 0) {
      const startTime = Date.now()
      const expectedDurationMs = duration * 1000

      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(99, (elapsed / expectedDurationMs) * 100)
        options.onProgress?.(progress)
      }, 100)
    }

    return true
  }, [canvasRef, finishExport, cancelExport, duration])

  const stopCapture = useCallback(() => {
    // Clear progress tracking
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancelCapture = useCallback(() => {
    // Clear progress tracking
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    chunksRef.current = []
    cancelExport()
  }, [cancelExport])

  return {
    startCapture,
    stopCapture,
    cancelCapture,
    isFormatSupported,
  }
}

function downloadBlob(blob: Blob, format: ExportFormat) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tephral-${Date.now()}.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
