import { useEffect, useRef, useCallback } from 'react'
import {
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import {
  useLandmarksStore,
  type FaceLandmarks,
  type HandLandmarks,
  type PoseLandmarks,
} from '../stores/landmarksStore'
import { useMediaStore } from '../stores/mediaStore'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

export function useLandmarkDetection() {
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number>(0)
  const lastDetectionTimeRef = useRef<number>(0)

  const { videoElement, source } = useMediaStore()
  const {
    enabled,
    currentMode,
    minDetectionConfidence,
    minTrackingConfidence,
    maxFaces,
    maxHands,
    setFaces,
    setHands,
    setPoses,
    setIsRunning,
    setModelLoaded,
    setError,
  } = useLandmarksStore()

  // Load models based on current mode
  useEffect(() => {
    let mounted = true

    const loadModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)

        if (currentMode === 'face' || currentMode === 'holistic') {
          if (!faceLandmarkerRef.current) {
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numFaces: maxFaces,
              minFaceDetectionConfidence: minDetectionConfidence,
              minFacePresenceConfidence: minTrackingConfidence,
              minTrackingConfidence: minTrackingConfidence,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            })
          }
        }

        if (currentMode === 'hands' || currentMode === 'holistic') {
          if (!handLandmarkerRef.current) {
            handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numHands: maxHands,
              minHandDetectionConfidence: minDetectionConfidence,
              minHandPresenceConfidence: minTrackingConfidence,
              minTrackingConfidence: minTrackingConfidence,
            })
          }
        }

        if (currentMode === 'pose' || currentMode === 'holistic') {
          if (!poseLandmarkerRef.current) {
            poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: minDetectionConfidence,
              minPosePresenceConfidence: minTrackingConfidence,
              minTrackingConfidence: minTrackingConfidence,
            })
          }
        }

        if (mounted) {
          setModelLoaded(true)
          console.log(`MediaPipe models loaded for mode: ${currentMode}`)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load landmark models')
        }
      }
    }

    if (currentMode !== 'off') {
      loadModels()
    }

    return () => {
      mounted = false
    }
  }, [currentMode, maxFaces, maxHands, minDetectionConfidence, minTrackingConfidence, setModelLoaded, setError])

  // Process face landmarks
  const processFaceResult = useCallback((result: FaceLandmarkerResult): FaceLandmarks[] => {
    return result.faceLandmarks.map((landmarks, idx) => {
      const xs = landmarks.map(l => l.x)
      const ys = landmarks.map(l => l.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      return {
        id: `face-${idx}`,
        points: landmarks.map((lm, i) => ({
          id: `face-${idx}-${i}`,
          point: { x: lm.x, y: lm.y, z: lm.z || 0 },
          visibility: lm.visibility,
        })),
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
      }
    })
  }, [])

  // Process hand landmarks
  const processHandResult = useCallback((result: HandLandmarkerResult): HandLandmarks[] => {
    return result.landmarks.map((landmarks, idx) => ({
      id: `hand-${idx}`,
      handedness: (result.handednesses[idx]?.[0]?.categoryName as 'Left' | 'Right') || 'Right',
      points: landmarks.map((lm, i) => ({
        id: `hand-${idx}-${i}`,
        point: { x: lm.x, y: lm.y, z: lm.z || 0 },
      })),
      confidence: result.handednesses[idx]?.[0]?.score || 0,
    }))
  }, [])

  // Process pose landmarks
  const processPoseResult = useCallback((result: PoseLandmarkerResult): PoseLandmarks[] => {
    return result.landmarks.map((landmarks, idx) => ({
      id: `pose-${idx}`,
      points: landmarks.map((lm, i) => ({
        id: `pose-${idx}-${i}`,
        point: { x: lm.x, y: lm.y, z: lm.z || 0 },
        visibility: lm.visibility,
      })),
      worldPoints: result.worldLandmarks[idx]?.map((lm, i) => ({
        id: `pose-world-${idx}-${i}`,
        point: { x: lm.x, y: lm.y, z: lm.z || 0 },
        visibility: lm.visibility,
      })),
    }))
  }, [])

  // Run detection loop
  const runDetection = useCallback(async () => {
    if (!enabled || currentMode === 'off' || !videoElement) {
      return
    }

    // Throttle to ~30fps
    const now = performance.now()
    if (now - lastDetectionTimeRef.current < 33) {
      animationFrameRef.current = requestAnimationFrame(runDetection)
      return
    }
    lastDetectionTimeRef.current = now

    try {
      if ((currentMode === 'face' || currentMode === 'holistic') && faceLandmarkerRef.current) {
        const result = faceLandmarkerRef.current.detectForVideo(videoElement, now)
        setFaces(processFaceResult(result))
      }

      if ((currentMode === 'hands' || currentMode === 'holistic') && handLandmarkerRef.current) {
        const result = handLandmarkerRef.current.detectForVideo(videoElement, now)
        setHands(processHandResult(result))
      }

      if ((currentMode === 'pose' || currentMode === 'holistic') && poseLandmarkerRef.current) {
        const result = poseLandmarkerRef.current.detectForVideo(videoElement, now)
        setPoses(processPoseResult(result))
      }
    } catch (err) {
      console.error('Landmark detection error:', err)
    }

    if (enabled && source !== 'none') {
      animationFrameRef.current = requestAnimationFrame(runDetection)
    }
  }, [enabled, currentMode, videoElement, source, setFaces, setHands, setPoses, processFaceResult, processHandResult, processPoseResult])

  // Start/stop detection
  useEffect(() => {
    if (enabled && currentMode !== 'off' && source !== 'none') {
      setIsRunning(true)
      runDetection()
    } else {
      setIsRunning(false)
      cancelAnimationFrame(animationFrameRef.current)
      if (!enabled || currentMode === 'off') {
        setFaces([])
        setHands([])
        setPoses([])
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, currentMode, source, runDetection, setIsRunning, setFaces, setHands, setPoses])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      faceLandmarkerRef.current?.close()
      handLandmarkerRef.current?.close()
      poseLandmarkerRef.current?.close()
    }
  }, [])

  return {
    isModelLoaded: !!(faceLandmarkerRef.current || handLandmarkerRef.current || poseLandmarkerRef.current),
  }
}
