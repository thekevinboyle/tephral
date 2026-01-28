import { useRef, useCallback } from 'react'
import { useRecordingStore, EXPORT_BITRATES, type ExportFormat, type ExportQuality } from '../stores/recordingStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { renderDataOverlayToCanvas } from '../components/overlays/DataOverlay'

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

// Helper to count enabled effects for the data overlay
function countEnabledEffects(glitchStore: {
  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean
  noiseEnabled: boolean
  pixelateEnabled: boolean
  edgeDetectionEnabled: boolean
  chromaticAberrationEnabled: boolean
  vhsTrackingEnabled: boolean
  lensDistortionEnabled: boolean
  ditherEnabled: boolean
  posterizeEnabled: boolean
  staticDisplacementEnabled: boolean
  colorGradeEnabled: boolean
  feedbackLoopEnabled: boolean
}): number {
  let count = 0
  if (glitchStore.rgbSplitEnabled) count++
  if (glitchStore.blockDisplaceEnabled) count++
  if (glitchStore.scanLinesEnabled) count++
  if (glitchStore.noiseEnabled) count++
  if (glitchStore.pixelateEnabled) count++
  if (glitchStore.edgeDetectionEnabled) count++
  if (glitchStore.chromaticAberrationEnabled) count++
  if (glitchStore.vhsTrackingEnabled) count++
  if (glitchStore.lensDistortionEnabled) count++
  if (glitchStore.ditherEnabled) count++
  if (glitchStore.posterizeEnabled) count++
  if (glitchStore.staticDisplacementEnabled) count++
  if (glitchStore.colorGradeEnabled) count++
  if (glitchStore.feedbackLoopEnabled) count++
  return count
}

export function useCanvasCapture(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const progressIntervalRef = useRef<number | null>(null)
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const { finishExport, cancelExport, duration } = useRecordingStore()

  const isFormatSupported = useCallback((format: ExportFormat): boolean => {
    return getMimeType(format) !== null
  }, [])

  const startCapture = useCallback((options: CaptureOptions): boolean => {
    const sourceCanvas = canvasRef.current
    if (!sourceCanvas) {
      console.error('Canvas ref not available')
      return false
    }

    const mimeType = getMimeType(options.format)
    if (!mimeType) {
      console.error(`Format ${options.format} not supported`)
      return false
    }

    // Create or reuse composite canvas for capturing with overlays
    if (!compositeCanvasRef.current) {
      compositeCanvasRef.current = document.createElement('canvas')
    }
    const compositeCanvas = compositeCanvasRef.current
    compositeCanvas.width = sourceCanvas.width
    compositeCanvas.height = sourceCanvas.height

    const compositeCtx = compositeCanvas.getContext('2d')
    if (!compositeCtx) {
      console.error('Failed to get composite canvas context')
      return false
    }

    // Start compositing loop that draws source canvas + data overlay
    const compositeFrame = () => {
      // Copy source canvas
      compositeCtx.drawImage(sourceCanvas, 0, 0)

      // Get current state from stores and draw data overlay
      const dataOverlayState = useDataOverlayStore.getState()
      const glitchState = useGlitchEngineStore.getState()
      const recordingState = useRecordingStore.getState()

      if (dataOverlayState.enabled) {
        const effectCount = countEnabledEffects(glitchState)
        renderDataOverlayToCanvas(
          compositeCtx,
          dataOverlayState,
          compositeCanvas.width,
          compositeCanvas.height,
          {
            duration: recordingState.duration,
            effectCount,
          }
        )
      }

      animationFrameRef.current = requestAnimationFrame(compositeFrame)
    }

    // Start the compositing loop
    compositeFrame()

    // Capture stream from composite canvas (not source)
    const stream = compositeCanvas.captureStream(30) // 30 FPS
    const bitrate = EXPORT_BITRATES[options.quality]

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      })
    } catch (e) {
      console.error('Failed to create MediaRecorder:', e)
      // Clean up animation frame on error
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return false
    }

    chunksRef.current = []

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorderRef.current.onstop = () => {
      // Stop the compositing loop
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      const blob = new Blob(chunksRef.current, { type: mimeType })
      downloadBlob(blob, options.format)
      finishExport()
    }

    mediaRecorderRef.current.onerror = (e) => {
      console.error('MediaRecorder error:', e)
      // Stop the compositing loop on error
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
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

    // Stop compositing loop (also stopped in onstop handler, but be safe)
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
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

    // Stop compositing loop
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
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
