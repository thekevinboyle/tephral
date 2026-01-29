import { useEffect, useRef } from 'react'
import { useRecordingStore, EXPORT_BITRATES } from '../stores/recordingStore'
import { useClipStore } from '../stores/clipStore'

/**
 * Hook that captures the canvas to video during recording.
 * Composites all overlay canvases together to capture the full effect stack.
 * When recording starts, it begins capturing the canvas with effects.
 * When recording stops, it saves the video blob to the store.
 *
 * @param canvasRef - Ref to the main WebGL canvas element
 * @param canvasElement - The actual canvas element (used as dependency to trigger re-runs)
 */
export function useRecordingCapture(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasElement: HTMLCanvasElement | null = null
) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number>(0)

  const {
    isRecording,
    exportQuality,
  } = useRecordingStore()

  const addClip = useClipStore((state) => state.addClip)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('[Recording] Canvas not available yet')
      return
    }

    if (isRecording) {
      // Start recording
      chunksRef.current = []
      startTimeRef.current = performance.now()

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
        // Create composite canvas for capturing all layers
        if (!compositeCanvasRef.current) {
          compositeCanvasRef.current = document.createElement('canvas')
        }
        const compositeCanvas = compositeCanvasRef.current
        compositeCanvas.width = canvas.width
        compositeCanvas.height = canvas.height

        const compositeCtx = compositeCanvas.getContext('2d')
        if (!compositeCtx) {
          console.error('[Recording] Failed to get composite canvas context')
          return
        }

        // Find the container that holds all canvases (parent of the WebGL canvas)
        const container = canvas.parentElement
        const overlayCanvases = container?.querySelectorAll('canvas') || []
        console.log('[Recording] Found', overlayCanvases.length, 'canvases to composite')

        // Compositing function - draws all canvases in DOM order
        const compositeFrame = () => {
          // Clear composite canvas
          compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)

          // Draw the main WebGL canvas first
          compositeCtx.drawImage(canvas, 0, 0)

          // Find and draw all overlay canvases in the container
          if (container) {
            const overlayCanvases = container.querySelectorAll('canvas')
            overlayCanvases.forEach((overlayCanvas) => {
              // Skip the main WebGL canvas (already drawn)
              if (overlayCanvas === canvas) return
              // Skip hidden canvases
              if (overlayCanvas.style.display === 'none') return
              if (overlayCanvas.style.visibility === 'hidden') return
              // Skip canvases with 0 opacity
              if (overlayCanvas.style.opacity === '0') return

              try {
                compositeCtx.drawImage(overlayCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height)
              } catch {
                // Canvas might be tainted or unavailable, skip it
              }
            })
          }

          animationFrameRef.current = requestAnimationFrame(compositeFrame)
        }

        // Start compositing loop
        compositeFrame()

        // Capture from composite canvas
        const stream = compositeCanvas.captureStream(30) // 30 FPS
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
          // Stop compositing loop
          cancelAnimationFrame(animationFrameRef.current)

          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: mimeType })
            const duration = (performance.now() - startTimeRef.current) / 1000
            addClip(blob, duration)
            console.log('[Recording] Video captured, size:', blob.size, 'duration:', duration)
          }
        }

        mediaRecorderRef.current.start(100) // Collect data every 100ms
        console.log('[Recording] Started capturing composite canvas')
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err)
      }
    } else {
      // Stop recording
      cancelAnimationFrame(animationFrameRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        console.log('[Recording] Stopped capturing')
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording, canvasRef, canvasElement, exportQuality, addClip])
}
