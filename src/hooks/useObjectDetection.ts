import { useEffect, useRef, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import { useDetectionStore, type Detection } from '../stores/detectionStore'
import { useMediaStore } from '../stores/mediaStore'

export function useObjectDetection() {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const animationFrameRef = useRef<number>(0)
  const lastDetectionTimeRef = useRef<number>(0)

  const { videoElement, imageElement, source } = useMediaStore()
  const {
    enabled,
    minConfidence,
    maxDetections,
    targetClasses,
    setDetections,
    setIsRunning,
    setModelLoaded,
    setError,
  } = useDetectionStore()

  // Load model on mount
  useEffect(() => {
    let mounted = true

    const loadModel = async () => {
      try {
        // Ensure WebGL backend is ready
        await tf.setBackend('webgl')
        await tf.ready()

        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Faster, lighter model
        })

        if (mounted) {
          modelRef.current = model
          setModelLoaded(true)
          console.log('COCO-SSD model loaded')
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load detection model')
        }
      }
    }

    loadModel()

    return () => {
      mounted = false
    }
  }, [setModelLoaded, setError])

  // Run detection loop
  const runDetection = useCallback(async () => {
    if (!modelRef.current || !enabled) return

    const input = videoElement || imageElement
    if (!input) return

    // Throttle to ~15fps for performance
    const now = performance.now()
    if (now - lastDetectionTimeRef.current < 66) {
      animationFrameRef.current = requestAnimationFrame(runDetection)
      return
    }
    lastDetectionTimeRef.current = now

    try {
      const predictions = await modelRef.current.detect(input as HTMLImageElement | HTMLVideoElement)

      // Filter and transform results
      const detections: Detection[] = predictions
        .filter(pred => {
          if (pred.score < minConfidence) return false
          if (targetClasses.length > 0 && !targetClasses.includes(pred.class)) return false
          return true
        })
        .slice(0, maxDetections)
        .map((pred, idx) => {
          const [x, y, width, height] = pred.bbox
          const inputWidth = input instanceof HTMLVideoElement ? input.videoWidth : input.naturalWidth
          const inputHeight = input instanceof HTMLVideoElement ? input.videoHeight : input.naturalHeight

          return {
            id: `det-${idx}-${now}`,
            label: pred.class,
            confidence: pred.score,
            bbox: {
              x: x / inputWidth,
              y: y / inputHeight,
              width: width / inputWidth,
              height: height / inputHeight,
            },
            timestamp: now,
          }
        })

      setDetections(detections)
    } catch (err) {
      console.error('Detection error:', err)
    }

    if (enabled && source !== 'none') {
      animationFrameRef.current = requestAnimationFrame(runDetection)
    }
  }, [enabled, videoElement, imageElement, source, minConfidence, maxDetections, targetClasses, setDetections])

  // Start/stop detection based on enabled state
  useEffect(() => {
    if (enabled && modelRef.current && source !== 'none') {
      setIsRunning(true)
      runDetection()
    } else {
      setIsRunning(false)
      cancelAnimationFrame(animationFrameRef.current)
      if (!enabled) {
        setDetections([])
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, source, runDetection, setIsRunning, setDetections])

  return {
    isModelLoaded: !!modelRef.current,
  }
}
