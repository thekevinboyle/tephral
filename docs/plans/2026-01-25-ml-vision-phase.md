# Phase 7: ML-Powered Computer Vision

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add machine learning computer vision capabilities to strand-tracer, enabling real-time object detection, landmark tracking, and artistic rendering effects that respond to detected subjects.

**Inspiration:** The target effects include:
- Feature point detection with network graph visualization (curved connecting lines)
- Object detection with stylized bounding boxes and labels
- ASCII/Matrix text rendering that reveals detected subjects
- Stipple/particle rendering based on image brightness
- Motion masking that isolates detected regions

**Architecture:**
- TensorFlow.js runs inference in parallel with render loop
- MediaPipe provides high-density landmark detection (face, hands, pose)
- Detection results stored in Zustand stores, consumed by effect modules
- Effects render as Three.js overlay layers composited with existing pipeline

---

## Phase 7.1: Install ML Dependencies

### Task 7.1.1: Install TensorFlow.js and COCO-SSD

**Files:**
- Modify: `package.json`

**Step 1: Install TensorFlow.js core**

Run:
```bash
cd /Users/kevin/Documents/web/strand-tracer
npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgl
```

Expected: TensorFlow.js added to dependencies with WebGL backend for GPU acceleration

**Step 2: Install COCO-SSD object detection model**

Run:
```bash
npm install @tensorflow-models/coco-ssd
```

Expected: Pre-trained object detection model added (detects 80 common objects)

**Step 3: Verify installation**

Run:
```bash
npm ls @tensorflow/tfjs @tensorflow-models/coco-ssd
```

Expected: Both packages listed without errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install tensorflow.js and coco-ssd for object detection"
```

---

### Task 7.1.2: Install MediaPipe Vision Tasks

**Files:**
- Modify: `package.json`

**Step 1: Install MediaPipe tasks-vision**

Run:
```bash
npm install @mediapipe/tasks-vision
```

Expected: MediaPipe Vision SDK added for high-quality landmark detection

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install mediapipe tasks-vision for landmark detection"
```

---

## Phase 7.2: Detection Stores

### Task 7.2.1: Create Detection Store

**Files:**
- Create: `src/stores/detectionStore.ts`

**Step 1: Define detection types and store**

Create `src/stores/detectionStore.ts`:

```typescript
import { create } from 'zustand'

export interface BoundingBox {
  x: number      // normalized 0-1
  y: number      // normalized 0-1
  width: number  // normalized 0-1
  height: number // normalized 0-1
}

export interface Detection {
  id: string
  label: string
  confidence: number
  bbox: BoundingBox
  timestamp: number
}

interface DetectionState {
  // Detection results
  detections: Detection[]
  isRunning: boolean
  modelLoaded: boolean
  error: string | null

  // Settings
  enabled: boolean
  minConfidence: number
  maxDetections: number
  targetClasses: string[] // empty = all classes

  // Actions
  setDetections: (detections: Detection[]) => void
  setIsRunning: (running: boolean) => void
  setModelLoaded: (loaded: boolean) => void
  setError: (error: string | null) => void
  setEnabled: (enabled: boolean) => void
  setMinConfidence: (confidence: number) => void
  setMaxDetections: (max: number) => void
  setTargetClasses: (classes: string[]) => void
  reset: () => void
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detections: [],
  isRunning: false,
  modelLoaded: false,
  error: null,

  enabled: false,
  minConfidence: 0.5,
  maxDetections: 10,
  targetClasses: [],

  setDetections: (detections) => set({ detections }),
  setIsRunning: (running) => set({ isRunning: running }),
  setModelLoaded: (loaded) => set({ modelLoaded: loaded }),
  setError: (error) => set({ error }),
  setEnabled: (enabled) => set({ enabled }),
  setMinConfidence: (confidence) => set({ minConfidence: confidence }),
  setMaxDetections: (max) => set({ maxDetections: max }),
  setTargetClasses: (classes) => set({ targetClasses: classes }),
  reset: () => set({
    detections: [],
    isRunning: false,
    error: null,
    enabled: false,
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/detectionStore.ts
git commit -m "feat: add detection store for object detection results"
```

---

### Task 7.2.2: Create Landmarks Store

**Files:**
- Create: `src/stores/landmarksStore.ts`

**Step 1: Define landmark types and store**

Create `src/stores/landmarksStore.ts`:

```typescript
import { create } from 'zustand'

export interface Point2D {
  x: number // normalized 0-1
  y: number // normalized 0-1
}

export interface Point3D extends Point2D {
  z: number // depth, normalized
}

export interface Landmark {
  id: string
  point: Point3D
  visibility?: number // 0-1, how visible the point is
}

export interface FaceLandmarks {
  id: string
  points: Landmark[]     // 468 points for face mesh
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface HandLandmarks {
  id: string
  handedness: 'Left' | 'Right'
  points: Landmark[]     // 21 points per hand
  confidence: number
}

export interface PoseLandmarks {
  id: string
  points: Landmark[]     // 33 points for body pose
  worldPoints?: Landmark[] // 3D world coordinates
}

export type LandmarkMode = 'off' | 'face' | 'hands' | 'pose' | 'holistic'

interface LandmarksState {
  // Detection results
  faces: FaceLandmarks[]
  hands: HandLandmarks[]
  poses: PoseLandmarks[]

  // State
  isRunning: boolean
  modelLoaded: boolean
  error: string | null
  currentMode: LandmarkMode

  // Settings
  enabled: boolean
  minDetectionConfidence: number
  minTrackingConfidence: number
  maxFaces: number
  maxHands: number

  // Actions
  setFaces: (faces: FaceLandmarks[]) => void
  setHands: (hands: HandLandmarks[]) => void
  setPoses: (poses: PoseLandmarks[]) => void
  setIsRunning: (running: boolean) => void
  setModelLoaded: (loaded: boolean) => void
  setError: (error: string | null) => void
  setCurrentMode: (mode: LandmarkMode) => void
  setEnabled: (enabled: boolean) => void
  setMinDetectionConfidence: (confidence: number) => void
  setMinTrackingConfidence: (confidence: number) => void
  setMaxFaces: (max: number) => void
  setMaxHands: (max: number) => void
  reset: () => void
}

export const useLandmarksStore = create<LandmarksState>((set) => ({
  faces: [],
  hands: [],
  poses: [],

  isRunning: false,
  modelLoaded: false,
  error: null,
  currentMode: 'off',

  enabled: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  maxFaces: 1,
  maxHands: 2,

  setFaces: (faces) => set({ faces }),
  setHands: (hands) => set({ hands }),
  setPoses: (poses) => set({ poses }),
  setIsRunning: (running) => set({ isRunning: running }),
  setModelLoaded: (loaded) => set({ modelLoaded: loaded }),
  setError: (error) => set({ error }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setEnabled: (enabled) => set({ enabled }),
  setMinDetectionConfidence: (confidence) => set({ minDetectionConfidence: confidence }),
  setMinTrackingConfidence: (confidence) => set({ minTrackingConfidence: confidence }),
  setMaxFaces: (max) => set({ maxFaces: max }),
  setMaxHands: (max) => set({ maxHands: max }),
  reset: () => set({
    faces: [],
    hands: [],
    poses: [],
    isRunning: false,
    error: null,
    currentMode: 'off',
    enabled: false,
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/landmarksStore.ts
git commit -m "feat: add landmarks store for face/hand/pose tracking"
```

---

## Phase 7.3: Detection Hooks

### Task 7.3.1: Create Object Detection Hook

**Files:**
- Create: `src/hooks/useObjectDetection.ts`

**Step 1: Create COCO-SSD detection hook**

Create `src/hooks/useObjectDetection.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/hooks/useObjectDetection.ts
git commit -m "feat: add object detection hook using COCO-SSD"
```

---

### Task 7.3.2: Create Landmark Detection Hook

**Files:**
- Create: `src/hooks/useLandmarkDetection.ts`

**Step 1: Create MediaPipe landmark detection hook**

Create `src/hooks/useLandmarkDetection.ts`:

```typescript
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
  type LandmarkMode,
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
```

**Step 2: Commit**

```bash
git add src/hooks/useLandmarkDetection.ts
git commit -m "feat: add landmark detection hook using MediaPipe"
```

---

## Phase 7.4: Effect Modules - Detection Overlay

### Task 7.4.1: Create Detection Overlay Effect Store

**Files:**
- Create: `src/stores/detectionOverlayStore.ts`

**Step 1: Create overlay settings store**

Create `src/stores/detectionOverlayStore.ts`:

```typescript
import { create } from 'zustand'

export interface DetectionOverlayParams {
  // Bounding box style
  boxColor: string
  boxOpacity: number
  boxLineWidth: number
  boxStyle: 'solid' | 'dashed' | 'corners'

  // Label style
  showLabels: boolean
  labelColor: string
  labelBgColor: string
  labelFontSize: number
  showConfidence: boolean
  customLabelText: string // e.g., "REPROGRAM" - empty = use detected class

  // Animation
  animateBoxes: boolean
  pulseSpeed: number
  glitchLabels: boolean
}

export const DEFAULT_DETECTION_OVERLAY_PARAMS: DetectionOverlayParams = {
  boxColor: '#00ff00',
  boxOpacity: 1.0,
  boxLineWidth: 2,
  boxStyle: 'solid',

  showLabels: true,
  labelColor: '#00ff00',
  labelBgColor: '#000000',
  labelFontSize: 12,
  showConfidence: false,
  customLabelText: '',

  animateBoxes: false,
  pulseSpeed: 1.0,
  glitchLabels: true,
}

interface DetectionOverlayState {
  enabled: boolean
  params: DetectionOverlayParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<DetectionOverlayParams>) => void
  reset: () => void
}

export const useDetectionOverlayStore = create<DetectionOverlayState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_DETECTION_OVERLAY_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_DETECTION_OVERLAY_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/detectionOverlayStore.ts
git commit -m "feat: add detection overlay settings store"
```

---

### Task 7.4.2: Create Detection Overlay Canvas Component

**Files:**
- Create: `src/components/overlays/DetectionOverlay.tsx`

**Step 1: Create canvas-based overlay for bounding boxes**

Create `src/components/overlays/DetectionOverlay.tsx`:

```typescript
import { useRef, useEffect } from 'react'
import { useDetectionStore } from '../../stores/detectionStore'
import { useDetectionOverlayStore } from '../../stores/detectionOverlayStore'

interface DetectionOverlayProps {
  width: number
  height: number
}

export function DetectionOverlay({ width, height }: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { detections } = useDetectionStore()
  const { enabled, params } = useDetectionOverlayStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const time = performance.now() / 1000

    detections.forEach((detection, idx) => {
      const x = detection.bbox.x * width
      const y = detection.bbox.y * height
      const w = detection.bbox.width * width
      const h = detection.bbox.height * height

      // Calculate pulse if animated
      let opacity = params.boxOpacity
      if (params.animateBoxes) {
        opacity *= 0.7 + 0.3 * Math.sin(time * params.pulseSpeed * Math.PI * 2 + idx)
      }

      // Set box style
      ctx.strokeStyle = params.boxColor
      ctx.globalAlpha = opacity
      ctx.lineWidth = params.boxLineWidth

      if (params.boxStyle === 'dashed') {
        ctx.setLineDash([8, 4])
      } else {
        ctx.setLineDash([])
      }

      // Draw box
      if (params.boxStyle === 'corners') {
        const cornerLen = Math.min(w, h) * 0.2
        // Top-left
        ctx.beginPath()
        ctx.moveTo(x, y + cornerLen)
        ctx.lineTo(x, y)
        ctx.lineTo(x + cornerLen, y)
        ctx.stroke()
        // Top-right
        ctx.beginPath()
        ctx.moveTo(x + w - cornerLen, y)
        ctx.lineTo(x + w, y)
        ctx.lineTo(x + w, y + cornerLen)
        ctx.stroke()
        // Bottom-right
        ctx.beginPath()
        ctx.moveTo(x + w, y + h - cornerLen)
        ctx.lineTo(x + w, y + h)
        ctx.lineTo(x + w - cornerLen, y + h)
        ctx.stroke()
        // Bottom-left
        ctx.beginPath()
        ctx.moveTo(x + cornerLen, y + h)
        ctx.lineTo(x, y + h)
        ctx.lineTo(x, y + h - cornerLen)
        ctx.stroke()
      } else {
        ctx.strokeRect(x, y, w, h)
      }

      // Draw label
      if (params.showLabels) {
        ctx.globalAlpha = 1.0

        let labelText = params.customLabelText || detection.label.toUpperCase()
        if (params.showConfidence) {
          labelText += ` ${(detection.confidence * 100).toFixed(0)}%`
        }

        // Apply glitch effect to label
        if (params.glitchLabels && Math.random() > 0.95) {
          labelText = labelText.split('').map(c =>
            Math.random() > 0.8 ? String.fromCharCode(Math.floor(Math.random() * 26) + 65) : c
          ).join('')
        }

        ctx.font = `bold ${params.labelFontSize}px monospace`
        const textWidth = ctx.measureText(labelText).width
        const padding = 4

        // Label background
        ctx.fillStyle = params.labelBgColor
        ctx.fillRect(x, y - params.labelFontSize - padding * 2, textWidth + padding * 2, params.labelFontSize + padding * 2)

        // Label text
        ctx.fillStyle = params.labelColor
        ctx.fillText(labelText, x + padding, y - padding)
      }
    })
  }, [detections, enabled, params, width, height])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/DetectionOverlay.tsx
git commit -m "feat: add detection overlay canvas component"
```

---

## Phase 7.5: Effect Modules - Point Network

### Task 7.5.1: Create Point Network Effect Store

**Files:**
- Create: `src/stores/pointNetworkStore.ts`

**Step 1: Create point network settings store**

Create `src/stores/pointNetworkStore.ts`:

```typescript
import { create } from 'zustand'

export interface PointNetworkParams {
  // Points
  pointRadius: number
  pointColor: string
  pointOpacity: number
  showPoints: boolean

  // Lines
  lineColor: string
  lineColorSecondary: string
  lineOpacity: number
  lineWidth: number
  lineCurve: number       // 0 = straight, 1 = fully curved
  showLines: boolean

  // Connection rules
  maxDistance: number     // max distance for connecting points (normalized)
  connectionMode: 'nearest' | 'delaunay' | 'all' | 'mesh'
  maxConnections: number  // max connections per point

  // Labels
  showLabels: boolean
  labelPrefix: string     // e.g., "codecore_"
  labelFontSize: number
  labelColor: string

  // Animation
  animateLines: boolean
  flowSpeed: number
  pulsePoints: boolean
}

export const DEFAULT_POINT_NETWORK_PARAMS: PointNetworkParams = {
  pointRadius: 4,
  pointColor: '#00ffff',
  pointOpacity: 1.0,
  showPoints: true,

  lineColor: '#ff3366',
  lineColorSecondary: '#ffffff',
  lineOpacity: 0.8,
  lineWidth: 1,
  lineCurve: 0.3,
  showLines: true,

  maxDistance: 0.15,
  connectionMode: 'nearest',
  maxConnections: 4,

  showLabels: true,
  labelPrefix: 'codecore_',
  labelFontSize: 8,
  labelColor: '#ffffff',

  animateLines: true,
  flowSpeed: 1.0,
  pulsePoints: true,
}

interface PointNetworkState {
  enabled: boolean
  params: PointNetworkParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<PointNetworkParams>) => void
  reset: () => void
}

export const usePointNetworkStore = create<PointNetworkState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_POINT_NETWORK_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_POINT_NETWORK_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/pointNetworkStore.ts
git commit -m "feat: add point network effect settings store"
```

---

### Task 7.5.2: Create Point Network Canvas Component

**Files:**
- Create: `src/components/overlays/PointNetworkOverlay.tsx`

**Step 1: Create canvas-based point network visualization**

Create `src/components/overlays/PointNetworkOverlay.tsx`:

```typescript
import { useRef, useEffect, useMemo } from 'react'
import { useLandmarksStore, type Landmark } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'

interface PointNetworkOverlayProps {
  width: number
  height: number
}

// Bezier curve helper
function drawCurvedLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  curveFactor: number
) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1

  // Perpendicular offset for curve
  const offset = Math.sqrt(dx * dx + dy * dy) * curveFactor * 0.3
  const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * offset
  const perpY = dx / Math.sqrt(dx * dx + dy * dy) * offset

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(midX + perpX, midY + perpY, x2, y2)
  ctx.stroke()
}

export function PointNetworkOverlay({ width, height }: PointNetworkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { faces, hands, poses } = useLandmarksStore()
  const { enabled, params } = usePointNetworkStore()

  // Collect all points from landmarks
  const allPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; id: string; visibility?: number }> = []

    faces.forEach(face => {
      // Use subset of face points for cleaner visualization
      const keyIndices = [
        0, 1, 4, 5, 6, 7, 8, 9, 10,  // face outline
        33, 133, 362, 263,           // eye corners
        61, 291,                      // mouth corners
        1, 4,                         // nose
      ]
      keyIndices.forEach(i => {
        if (face.points[i]) {
          points.push({
            x: face.points[i].point.x,
            y: face.points[i].point.y,
            id: face.points[i].id,
            visibility: face.points[i].visibility,
          })
        }
      })
    })

    hands.forEach(hand => {
      hand.points.forEach(lm => {
        points.push({
          x: lm.point.x,
          y: lm.point.y,
          id: lm.id,
        })
      })
    })

    poses.forEach(pose => {
      pose.points.forEach(lm => {
        if ((lm.visibility || 0) > 0.5) {
          points.push({
            x: lm.point.x,
            y: lm.point.y,
            id: lm.id,
            visibility: lm.visibility,
          })
        }
      })
    })

    return points
  }, [faces, hands, poses])

  // Calculate connections based on mode
  const connections = useMemo(() => {
    if (!params.showLines || allPoints.length < 2) return []

    const conns: Array<[number, number]> = []

    if (params.connectionMode === 'nearest') {
      // Connect each point to nearest N neighbors within distance
      allPoints.forEach((p1, i) => {
        const distances: Array<{ idx: number; dist: number }> = []

        allPoints.forEach((p2, j) => {
          if (i === j) return
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
          if (dist <= params.maxDistance) {
            distances.push({ idx: j, dist })
          }
        })

        distances
          .sort((a, b) => a.dist - b.dist)
          .slice(0, params.maxConnections)
          .forEach(({ idx }) => {
            // Avoid duplicate connections
            if (i < idx) {
              conns.push([i, idx])
            }
          })
      })
    } else if (params.connectionMode === 'all') {
      // Connect all points within distance
      allPoints.forEach((p1, i) => {
        allPoints.forEach((p2, j) => {
          if (i >= j) return
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
          if (dist <= params.maxDistance) {
            conns.push([i, j])
          }
        })
      })
    }

    return conns
  }, [allPoints, params.showLines, params.connectionMode, params.maxDistance, params.maxConnections])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const time = performance.now() / 1000

    // Draw lines
    if (params.showLines) {
      connections.forEach(([i, j], idx) => {
        const p1 = allPoints[i]
        const p2 = allPoints[j]

        const x1 = p1.x * width
        const y1 = p1.y * height
        const x2 = p2.x * width
        const y2 = p2.y * height

        // Alternate colors
        ctx.strokeStyle = idx % 2 === 0 ? params.lineColor : params.lineColorSecondary
        ctx.globalAlpha = params.lineOpacity
        ctx.lineWidth = params.lineWidth

        // Animate line opacity
        if (params.animateLines) {
          const phase = (time * params.flowSpeed + idx * 0.1) % 1
          ctx.globalAlpha = params.lineOpacity * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2))
        }

        if (params.lineCurve > 0) {
          drawCurvedLine(ctx, x1, y1, x2, y2, params.lineCurve)
        } else {
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      })
    }

    // Draw points
    if (params.showPoints) {
      allPoints.forEach((point, idx) => {
        const x = point.x * width
        const y = point.y * height

        let radius = params.pointRadius
        if (params.pulsePoints) {
          radius *= 0.8 + 0.4 * Math.sin(time * 2 + idx * 0.5)
        }

        ctx.fillStyle = params.pointColor
        ctx.globalAlpha = params.pointOpacity * (point.visibility || 1)

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw label
        if (params.showLabels) {
          ctx.globalAlpha = 0.7
          ctx.fillStyle = params.labelColor
          ctx.font = `${params.labelFontSize}px monospace`
          ctx.fillText(`${params.labelPrefix}${idx}`, x + radius + 2, y + 3)
        }
      })
    }
  }, [allPoints, connections, enabled, params, width, height])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/PointNetworkOverlay.tsx
git commit -m "feat: add point network overlay with curved lines"
```

---

## Phase 7.6: Effect Modules - ASCII Render

### Task 7.6.1: Create ASCII Render Effect Store

**Files:**
- Create: `src/stores/asciiRenderStore.ts`

**Step 1: Create ASCII render settings store**

Create `src/stores/asciiRenderStore.ts`:

```typescript
import { create } from 'zustand'

export type AsciiMode = 'standard' | 'matrix' | 'blocks' | 'braille'

export interface AsciiRenderParams {
  // Character set
  mode: AsciiMode
  customChars: string    // custom character ramp (dark to light)
  fontSize: number

  // Colors
  colorMode: 'mono' | 'original' | 'gradient'
  monoColor: string
  gradientStart: string
  gradientEnd: string
  backgroundColor: string

  // Rendering
  resolution: number     // cell size in pixels
  contrast: number       // 0-2
  invert: boolean

  // Matrix mode specific
  matrixSpeed: number
  matrixDensity: number
  matrixTrailLength: number

  // Masking
  maskToDetections: boolean  // only render ASCII inside detected regions
}

export const DEFAULT_ASCII_PARAMS: AsciiRenderParams = {
  mode: 'standard',
  customChars: ' .:-=+*#%@',
  fontSize: 10,

  colorMode: 'mono',
  monoColor: '#00ff00',
  gradientStart: '#000000',
  gradientEnd: '#00ff00',
  backgroundColor: '#000000',

  resolution: 8,
  contrast: 1.0,
  invert: false,

  matrixSpeed: 1.0,
  matrixDensity: 0.8,
  matrixTrailLength: 20,

  maskToDetections: false,
}

// Character ramps for different modes
export const ASCII_CHAR_SETS: Record<AsciiMode, string> = {
  standard: ' .:-=+*#%@',
  matrix: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789',
  blocks: ' ░▒▓█',
  braille: ' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿',
}

interface AsciiRenderState {
  enabled: boolean
  params: AsciiRenderParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<AsciiRenderParams>) => void
  reset: () => void
}

export const useAsciiRenderStore = create<AsciiRenderState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_ASCII_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_ASCII_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/asciiRenderStore.ts
git commit -m "feat: add ASCII render effect settings store"
```

---

### Task 7.6.2: Create ASCII Render Shader

**Files:**
- Create: `src/shaders/asciiRender.frag`
- Create: `src/effects/vision/AsciiRenderEffect.ts`

**Step 1: Create ASCII fragment shader**

Create `src/shaders/asciiRender.frag`:

```glsl
uniform sampler2D tDiffuse;
uniform sampler2D tCharMap;      // texture containing character glyphs
uniform float cellSize;          // size of each cell in UV space
uniform float charCount;         // number of characters in ramp
uniform float contrast;
uniform bool invert;
uniform vec3 monoColor;
uniform bool useOriginalColor;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  // Calculate cell coordinates
  vec2 cellUv = floor(vUv * resolution) / resolution;
  vec2 cellOffset = fract(vUv * resolution);

  // Sample original color at cell center
  vec4 originalColor = texture2D(tDiffuse, cellUv + 0.5 / resolution);

  // Calculate brightness
  float brightness = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));

  // Apply contrast
  brightness = (brightness - 0.5) * contrast + 0.5;
  brightness = clamp(brightness, 0.0, 1.0);

  if (invert) {
    brightness = 1.0 - brightness;
  }

  // Map brightness to character index
  float charIndex = floor(brightness * (charCount - 1.0));

  // Sample character from map
  float charU = (charIndex + cellOffset.x) / charCount;
  float charV = cellOffset.y;
  vec4 charSample = texture2D(tCharMap, vec2(charU, charV));

  // Apply color
  vec3 finalColor = useOriginalColor ? originalColor.rgb : monoColor;

  gl_FragColor = vec4(finalColor * charSample.r, 1.0);
}
```

**Step 2: Create ASCII effect class (canvas-based for better text rendering)**

Create `src/effects/vision/AsciiRenderEffect.ts`:

```typescript
// ASCII rendering is better done with Canvas2D for crisp text
// This module provides the rendering logic to be used in a canvas overlay

import { AsciiRenderParams, ASCII_CHAR_SETS } from '../../stores/asciiRenderStore'

export interface MatrixColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  opacity: number
}

export class AsciiRenderer {
  private params: AsciiRenderParams
  private matrixColumns: MatrixColumn[] = []
  private lastTime: number = 0

  constructor(params: AsciiRenderParams) {
    this.params = params
  }

  updateParams(params: AsciiRenderParams) {
    this.params = params
  }

  // Initialize matrix columns
  initMatrix(width: number, height: number) {
    const colCount = Math.floor(width / this.params.fontSize)
    this.matrixColumns = []

    for (let i = 0; i < colCount; i++) {
      if (Math.random() < this.params.matrixDensity) {
        this.matrixColumns.push({
          x: i * this.params.fontSize,
          y: Math.random() * height,
          speed: 0.5 + Math.random() * 1.5,
          chars: this.generateMatrixChars(),
          opacity: 0.5 + Math.random() * 0.5,
        })
      }
    }
  }

  private generateMatrixChars(): string[] {
    const chars = ASCII_CHAR_SETS.matrix
    const length = this.params.matrixTrailLength
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)])
  }

  // Render ASCII art from image data
  renderAscii(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData,
    width: number,
    height: number
  ) {
    const { fontSize, resolution, contrast, invert, colorMode, monoColor, mode } = this.params
    const chars = mode === 'standard' && this.params.customChars
      ? this.params.customChars
      : ASCII_CHAR_SETS[mode]

    ctx.fillStyle = this.params.backgroundColor
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'

    const cellW = resolution
    const cellH = resolution
    const cols = Math.floor(width / cellW)
    const rows = Math.floor(height / cellH)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Sample pixel at cell center
        const px = Math.floor((col + 0.5) * cellW)
        const py = Math.floor((row + 0.5) * cellH)
        const idx = (py * imageData.width + px) * 4

        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]

        // Calculate brightness
        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        brightness = (brightness - 0.5) * contrast + 0.5
        brightness = Math.max(0, Math.min(1, brightness))

        if (invert) brightness = 1 - brightness

        // Map to character
        const charIdx = Math.floor(brightness * (chars.length - 1))
        const char = chars[charIdx]

        // Determine color
        if (colorMode === 'original') {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        } else if (colorMode === 'mono') {
          ctx.fillStyle = monoColor
        } else {
          // Gradient based on brightness
          ctx.fillStyle = this.interpolateColor(
            this.params.gradientStart,
            this.params.gradientEnd,
            brightness
          )
        }

        ctx.fillText(char, col * cellW, row * cellH)
      }
    }
  }

  // Render Matrix-style falling characters
  renderMatrix(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData | null,
    width: number,
    height: number,
    deltaTime: number
  ) {
    const { fontSize, monoColor, matrixSpeed } = this.params

    // Semi-transparent black overlay for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'

    // Update and draw columns
    this.matrixColumns.forEach(col => {
      // Update position
      col.y += col.speed * matrixSpeed * deltaTime * 100

      // Reset if off screen
      if (col.y > height + fontSize * col.chars.length) {
        col.y = -fontSize * col.chars.length
        col.chars = this.generateMatrixChars()
        col.speed = 0.5 + Math.random() * 1.5
      }

      // Draw characters
      col.chars.forEach((char, i) => {
        const y = col.y + i * fontSize
        if (y < 0 || y > height) return

        // Brightness based on image if available
        let brightness = 1
        if (imageData) {
          const px = Math.floor(col.x / width * imageData.width)
          const py = Math.floor(y / height * imageData.height)
          const idx = (py * imageData.width + px) * 4
          brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 765
        }

        // Fade based on position in trail
        const fade = 1 - i / col.chars.length
        const alpha = col.opacity * fade * brightness

        ctx.fillStyle = i === 0
          ? `rgba(255, 255, 255, ${alpha})` // Leading char is white
          : `rgba(0, 255, 0, ${alpha})`     // Trail is green

        ctx.fillText(char, col.x, y)
      })
    })
  }

  private interpolateColor(start: string, end: string, t: number): string {
    const s = this.hexToRgb(start)
    const e = this.hexToRgb(end)
    const r = Math.round(s.r + (e.r - s.r) * t)
    const g = Math.round(s.g + (e.g - s.g) * t)
    const b = Math.round(s.b + (e.b - s.b) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 }
  }
}
```

**Step 3: Commit**

```bash
git add src/shaders/asciiRender.frag src/effects/vision/AsciiRenderEffect.ts
git commit -m "feat: add ASCII render effect with matrix mode"
```

---

### Task 7.6.3: Create ASCII Render Overlay Component

**Files:**
- Create: `src/components/overlays/AsciiRenderOverlay.tsx`

**Step 1: Create canvas overlay for ASCII rendering**

Create `src/components/overlays/AsciiRenderOverlay.tsx`:

```typescript
import { useRef, useEffect } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useDetectionStore } from '../../stores/detectionStore'
import { AsciiRenderer } from '../../effects/vision/AsciiRenderEffect'

interface AsciiRenderOverlayProps {
  width: number
  height: number
}

export function AsciiRenderOverlay({ width, height }: AsciiRenderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<AsciiRenderer | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const { videoElement, imageElement } = useMediaStore()
  const { enabled, params } = useAsciiRenderStore()
  const { detections } = useDetectionStore()

  // Initialize renderer
  useEffect(() => {
    rendererRef.current = new AsciiRenderer(params)

    // Create offscreen canvas for sampling video
    offscreenCanvasRef.current = document.createElement('canvas')

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Update renderer params
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateParams(params)

      // Reinitialize matrix columns when mode changes
      if (params.mode === 'matrix') {
        rendererRef.current.initMatrix(width, height)
      }
    }
  }, [params, width, height])

  // Render loop
  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    const renderer = rendererRef.current

    if (!canvas || !offscreen || !renderer) return

    const ctx = canvas.getContext('2d')
    const offCtx = offscreen.getContext('2d')

    if (!ctx || !offCtx) return

    const render = () => {
      const now = performance.now()
      const deltaTime = (now - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = now

      // Get source dimensions
      const source = videoElement || imageElement
      if (!source) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      const srcWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
      const srcHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height

      // Setup offscreen canvas
      offscreen.width = Math.floor(width / params.resolution)
      offscreen.height = Math.floor(height / params.resolution)

      // Draw source to offscreen (downscaled)
      offCtx.drawImage(source, 0, 0, offscreen.width, offscreen.height)

      // Get image data
      let imageData: ImageData | null = null
      try {
        imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height)
      } catch (e) {
        // CORS issues with some sources
      }

      // Apply detection masking if enabled
      if (params.maskToDetections && detections.length > 0 && imageData) {
        const maskedData = new ImageData(imageData.width, imageData.height)

        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            const nx = x / imageData.width
            const ny = y / imageData.height

            // Check if point is inside any detection
            const insideDetection = detections.some(det =>
              nx >= det.bbox.x &&
              nx <= det.bbox.x + det.bbox.width &&
              ny >= det.bbox.y &&
              ny <= det.bbox.y + det.bbox.height
            )

            const idx = (y * imageData.width + x) * 4

            if (insideDetection) {
              maskedData.data[idx] = imageData.data[idx]
              maskedData.data[idx + 1] = imageData.data[idx + 1]
              maskedData.data[idx + 2] = imageData.data[idx + 2]
              maskedData.data[idx + 3] = 255
            } else {
              maskedData.data[idx] = 0
              maskedData.data[idx + 1] = 0
              maskedData.data[idx + 2] = 0
              maskedData.data[idx + 3] = 255
            }
          }
        }

        imageData = maskedData
      }

      // Render based on mode
      if (params.mode === 'matrix') {
        renderer.renderMatrix(ctx, imageData, width, height, deltaTime)
      } else if (imageData) {
        renderer.renderAscii(ctx, imageData, width, height)
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, videoElement, imageElement, params, width, height, detections])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/AsciiRenderOverlay.tsx
git commit -m "feat: add ASCII render overlay component"
```

---

## Phase 7.7: Effect Modules - Stipple Effect

### Task 7.7.1: Create Stipple Effect Store

**Files:**
- Create: `src/stores/stippleStore.ts`

**Step 1: Create stipple settings store**

Create `src/stores/stippleStore.ts`:

```typescript
import { create } from 'zustand'

export interface StippleParams {
  // Particle settings
  particleSize: number
  particleSizeVariation: number
  density: number           // particles per cell

  // Color
  colorMode: 'mono' | 'original' | 'gradient'
  monoColor: string
  backgroundColor: string

  // Distribution
  brightnessThreshold: number  // only place particles where brightness > threshold
  invertBrightness: boolean
  jitter: number              // random position offset

  // Animation
  animated: boolean
  animationSpeed: number
  breathe: boolean           // particles pulse in size
}

export const DEFAULT_STIPPLE_PARAMS: StippleParams = {
  particleSize: 3,
  particleSizeVariation: 0.5,
  density: 1,

  colorMode: 'mono',
  monoColor: '#000000',
  backgroundColor: '#ffffff',

  brightnessThreshold: 0.5,
  invertBrightness: true,  // dark areas get more particles
  jitter: 0.3,

  animated: false,
  animationSpeed: 1.0,
  breathe: false,
}

interface StippleState {
  enabled: boolean
  params: StippleParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<StippleParams>) => void
  reset: () => void
}

export const useStippleStore = create<StippleState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_STIPPLE_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_STIPPLE_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/stippleStore.ts
git commit -m "feat: add stipple effect settings store"
```

---

### Task 7.7.2: Create Stipple Overlay Component

**Files:**
- Create: `src/components/overlays/StippleOverlay.tsx`

**Step 1: Create canvas-based stipple renderer**

Create `src/components/overlays/StippleOverlay.tsx`:

```typescript
import { useRef, useEffect, useMemo } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useStippleStore } from '../../stores/stippleStore'

interface Particle {
  x: number
  y: number
  size: number
  brightness: number
  color: string
}

interface StippleOverlayProps {
  width: number
  height: number
}

export function StippleOverlay({ width, height }: StippleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number>(0)

  const { videoElement, imageElement } = useMediaStore()
  const { enabled, params } = useStippleStore()

  // Initialize offscreen canvas
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas')

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Generate particles from image
  const generateParticles = (imageData: ImageData): Particle[] => {
    const particles: Particle[] = []
    const {
      density,
      brightnessThreshold,
      invertBrightness,
      jitter,
      particleSize,
      particleSizeVariation,
      colorMode,
      monoColor,
    } = params

    const cellSize = 4 // Sample every N pixels

    for (let y = 0; y < imageData.height; y += cellSize) {
      for (let x = 0; x < imageData.width; x += cellSize) {
        const idx = (y * imageData.width + x) * 4
        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]

        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        if (invertBrightness) brightness = 1 - brightness

        // Only place particles where brightness exceeds threshold
        if (brightness > brightnessThreshold) {
          // Number of particles proportional to brightness
          const particleCount = Math.floor(density * (brightness - brightnessThreshold) / (1 - brightnessThreshold))

          for (let i = 0; i < particleCount; i++) {
            const jitterX = (Math.random() - 0.5) * cellSize * jitter
            const jitterY = (Math.random() - 0.5) * cellSize * jitter

            const px = (x + jitterX) / imageData.width * width
            const py = (y + jitterY) / imageData.height * height

            const size = particleSize * (1 + (Math.random() - 0.5) * particleSizeVariation)

            let color = monoColor
            if (colorMode === 'original') {
              color = `rgb(${r}, ${g}, ${b})`
            }

            particles.push({
              x: px,
              y: py,
              size,
              brightness,
              color,
            })
          }
        }
      }
    }

    return particles
  }

  // Render loop
  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current

    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d')
    const offCtx = offscreen.getContext('2d')

    if (!ctx || !offCtx) return

    let lastUpdateTime = 0
    const updateInterval = 100 // Update particles every 100ms for video

    const render = () => {
      const now = performance.now()
      const time = now / 1000

      // Clear canvas
      ctx.fillStyle = params.backgroundColor
      ctx.fillRect(0, 0, width, height)

      const source = videoElement || imageElement

      if (source) {
        // Update particles periodically
        if (now - lastUpdateTime > updateInterval || particlesRef.current.length === 0) {
          const srcWidth = videoElement?.videoWidth || imageElement?.naturalWidth || width
          const srcHeight = videoElement?.videoHeight || imageElement?.naturalHeight || height

          offscreen.width = Math.min(srcWidth, 256) // Limit resolution
          offscreen.height = Math.min(srcHeight, 256)

          offCtx.drawImage(source, 0, 0, offscreen.width, offscreen.height)

          try {
            const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height)
            particlesRef.current = generateParticles(imageData)
          } catch (e) {
            // CORS issues
          }

          lastUpdateTime = now
        }
      }

      // Draw particles
      particlesRef.current.forEach((particle, idx) => {
        let size = particle.size

        if (params.breathe) {
          size *= 0.8 + 0.4 * Math.sin(time * params.animationSpeed * 2 + idx * 0.1)
        }

        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, videoElement, imageElement, params, width, height])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/StippleOverlay.tsx
git commit -m "feat: add stipple effect overlay component"
```

---

## Phase 7.8: Integration and UI

### Task 7.8.1: Create Vision Effects Store Index

**Files:**
- Create: `src/stores/visionStores.ts`

**Step 1: Create index for all vision-related stores**

Create `src/stores/visionStores.ts`:

```typescript
// Re-export all vision-related stores for convenient imports
export { useDetectionStore } from './detectionStore'
export type { Detection, BoundingBox } from './detectionStore'

export { useLandmarksStore } from './landmarksStore'
export type {
  Point2D,
  Point3D,
  Landmark,
  FaceLandmarks,
  HandLandmarks,
  PoseLandmarks,
  LandmarkMode,
} from './landmarksStore'

export { useDetectionOverlayStore, DEFAULT_DETECTION_OVERLAY_PARAMS } from './detectionOverlayStore'
export type { DetectionOverlayParams } from './detectionOverlayStore'

export { usePointNetworkStore, DEFAULT_POINT_NETWORK_PARAMS } from './pointNetworkStore'
export type { PointNetworkParams } from './pointNetworkStore'

export { useAsciiRenderStore, DEFAULT_ASCII_PARAMS, ASCII_CHAR_SETS } from './asciiRenderStore'
export type { AsciiRenderParams, AsciiMode } from './asciiRenderStore'

export { useStippleStore, DEFAULT_STIPPLE_PARAMS } from './stippleStore'
export type { StippleParams } from './stippleStore'
```

**Step 2: Commit**

```bash
git add src/stores/visionStores.ts
git commit -m "feat: add vision stores index"
```

---

### Task 7.8.2: Create Vision Panel UI Component

**Files:**
- Create: `src/components/effects/VisionPanel.tsx`

**Step 1: Create tabbed panel for vision effect controls**

Create `src/components/effects/VisionPanel.tsx`:

```typescript
import { useState } from 'react'
import { Panel, Slider, Toggle } from '../ui'
import {
  useDetectionStore,
  useLandmarksStore,
  useDetectionOverlayStore,
  usePointNetworkStore,
  useAsciiRenderStore,
  useStippleStore,
} from '../../stores/visionStores'

type VisionTab = 'detect' | 'landmarks' | 'overlay' | 'network' | 'ascii' | 'stipple'

export function VisionPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<VisionTab>('detect')

  // Detection store
  const detection = useDetectionStore()
  const landmarks = useLandmarksStore()
  const overlay = useDetectionOverlayStore()
  const network = usePointNetworkStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  const tabs: { key: VisionTab; label: string }[] = [
    { key: 'detect', label: 'DETECT' },
    { key: 'landmarks', label: 'POINTS' },
    { key: 'overlay', label: 'BOXES' },
    { key: 'network', label: 'GRAPH' },
    { key: 'ascii', label: 'ASCII' },
    { key: 'stipple', label: 'DOTS' },
  ]

  return (
    <Panel
      title="ML VISION"
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-muted pb-2 mb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-2 py-1 text-xs uppercase ${
              activeTab === tab.key
                ? 'bg-accent-yellow text-base-dark'
                : 'text-muted hover:text-base-light'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detection controls */}
      {activeTab === 'detect' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="OBJECT DETECTION"
            pressed={detection.enabled}
            onPressedChange={detection.setEnabled}
          />
          {detection.enabled && (
            <>
              <div className="text-xs text-muted">
                {detection.modelLoaded ? 'Model loaded' : 'Loading model...'}
              </div>
              <Slider
                label="MIN CONFIDENCE"
                value={detection.minConfidence}
                min={0.1}
                max={0.9}
                onChange={detection.setMinConfidence}
              />
              <Slider
                label="MAX DETECTIONS"
                value={detection.maxDetections}
                min={1}
                max={20}
                step={1}
                onChange={detection.setMaxDetections}
              />
              {detection.detections.length > 0 && (
                <div className="text-xs text-accent-yellow">
                  Found: {detection.detections.map(d => d.label).join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Landmark controls */}
      {activeTab === 'landmarks' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="LANDMARK DETECTION"
            pressed={landmarks.enabled}
            onPressedChange={landmarks.setEnabled}
          />
          {landmarks.enabled && (
            <>
              <div className="flex gap-1">
                {(['face', 'hands', 'pose', 'holistic'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`px-2 py-1 text-xs uppercase ${
                      landmarks.currentMode === mode
                        ? 'bg-accent-yellow text-base-dark'
                        : 'border border-muted hover:border-base-light'
                    }`}
                    onClick={() => landmarks.setCurrentMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <Slider
                label="DETECTION CONF"
                value={landmarks.minDetectionConfidence}
                min={0.1}
                max={0.9}
                onChange={landmarks.setMinDetectionConfidence}
              />
              <div className="text-xs text-muted">
                {landmarks.modelLoaded ? 'Models loaded' : 'Loading models...'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Detection overlay controls */}
      {activeTab === 'overlay' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="BOUNDING BOXES"
            pressed={overlay.enabled}
            onPressedChange={overlay.setEnabled}
          />
          {overlay.enabled && (
            <>
              <div className="flex gap-1">
                {(['solid', 'dashed', 'corners'] as const).map(style => (
                  <button
                    key={style}
                    className={`px-2 py-1 text-xs uppercase ${
                      overlay.params.boxStyle === style
                        ? 'bg-accent-yellow text-base-dark'
                        : 'border border-muted hover:border-base-light'
                    }`}
                    onClick={() => overlay.updateParams({ boxStyle: style })}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <Slider
                label="LINE WIDTH"
                value={overlay.params.boxLineWidth}
                min={1}
                max={6}
                step={1}
                onChange={(v) => overlay.updateParams({ boxLineWidth: v })}
              />
              <Toggle
                label="SHOW LABELS"
                pressed={overlay.params.showLabels}
                onPressedChange={(v) => overlay.updateParams({ showLabels: v })}
              />
              <Toggle
                label="GLITCH LABELS"
                pressed={overlay.params.glitchLabels}
                onPressedChange={(v) => overlay.updateParams({ glitchLabels: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Point network controls */}
      {activeTab === 'network' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="POINT NETWORK"
            pressed={network.enabled}
            onPressedChange={network.setEnabled}
          />
          {network.enabled && (
            <>
              <Toggle
                label="SHOW POINTS"
                pressed={network.params.showPoints}
                onPressedChange={(v) => network.updateParams({ showPoints: v })}
              />
              <Toggle
                label="SHOW LINES"
                pressed={network.params.showLines}
                onPressedChange={(v) => network.updateParams({ showLines: v })}
              />
              <Slider
                label="POINT SIZE"
                value={network.params.pointRadius}
                min={1}
                max={10}
                onChange={(v) => network.updateParams({ pointRadius: v })}
              />
              <Slider
                label="LINE CURVE"
                value={network.params.lineCurve}
                min={0}
                max={1}
                onChange={(v) => network.updateParams({ lineCurve: v })}
              />
              <Slider
                label="MAX DISTANCE"
                value={network.params.maxDistance}
                min={0.05}
                max={0.5}
                onChange={(v) => network.updateParams({ maxDistance: v })}
              />
              <Toggle
                label="SHOW LABELS"
                pressed={network.params.showLabels}
                onPressedChange={(v) => network.updateParams({ showLabels: v })}
              />
            </>
          )}
        </div>
      )}

      {/* ASCII render controls */}
      {activeTab === 'ascii' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="ASCII RENDER"
            pressed={ascii.enabled}
            onPressedChange={ascii.setEnabled}
          />
          {ascii.enabled && (
            <>
              <div className="flex gap-1">
                {(['standard', 'matrix', 'blocks', 'braille'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`px-2 py-1 text-xs uppercase ${
                      ascii.params.mode === mode
                        ? 'bg-accent-yellow text-base-dark'
                        : 'border border-muted hover:border-base-light'
                    }`}
                    onClick={() => ascii.updateParams({ mode })}
                  >
                    {mode.slice(0, 4)}
                  </button>
                ))}
              </div>
              <Slider
                label="FONT SIZE"
                value={ascii.params.fontSize}
                min={6}
                max={20}
                step={1}
                onChange={(v) => ascii.updateParams({ fontSize: v })}
              />
              <Slider
                label="RESOLUTION"
                value={ascii.params.resolution}
                min={4}
                max={16}
                step={1}
                onChange={(v) => ascii.updateParams({ resolution: v })}
              />
              <Slider
                label="CONTRAST"
                value={ascii.params.contrast}
                min={0.5}
                max={2}
                onChange={(v) => ascii.updateParams({ contrast: v })}
              />
              <Toggle
                label="MASK TO DETECTIONS"
                pressed={ascii.params.maskToDetections}
                onPressedChange={(v) => ascii.updateParams({ maskToDetections: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Stipple controls */}
      {activeTab === 'stipple' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="STIPPLE EFFECT"
            pressed={stipple.enabled}
            onPressedChange={stipple.setEnabled}
          />
          {stipple.enabled && (
            <>
              <Slider
                label="PARTICLE SIZE"
                value={stipple.params.particleSize}
                min={1}
                max={8}
                onChange={(v) => stipple.updateParams({ particleSize: v })}
              />
              <Slider
                label="DENSITY"
                value={stipple.params.density}
                min={0.1}
                max={3}
                onChange={(v) => stipple.updateParams({ density: v })}
              />
              <Slider
                label="THRESHOLD"
                value={stipple.params.brightnessThreshold}
                min={0}
                max={1}
                onChange={(v) => stipple.updateParams({ brightnessThreshold: v })}
              />
              <Toggle
                label="INVERT"
                pressed={stipple.params.invertBrightness}
                onPressedChange={(v) => stipple.updateParams({ invertBrightness: v })}
              />
              <Toggle
                label="BREATHE"
                pressed={stipple.params.breathe}
                onPressedChange={(v) => stipple.updateParams({ breathe: v })}
              />
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/effects/VisionPanel.tsx
git commit -m "feat: add vision panel UI with all effect controls"
```

---

### Task 7.8.3: Create Overlay Container Component

**Files:**
- Create: `src/components/overlays/OverlayContainer.tsx`

**Step 1: Create container that manages all overlay layers**

Create `src/components/overlays/OverlayContainer.tsx`:

```typescript
import { useRef, useEffect, useState } from 'react'
import { DetectionOverlay } from './DetectionOverlay'
import { PointNetworkOverlay } from './PointNetworkOverlay'
import { AsciiRenderOverlay } from './AsciiRenderOverlay'
import { StippleOverlay } from './StippleOverlay'
import { useObjectDetection } from '../../hooks/useObjectDetection'
import { useLandmarkDetection } from '../../hooks/useLandmarkDetection'

interface OverlayContainerProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export function OverlayContainer({ containerRef }: OverlayContainerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Initialize detection hooks
  useObjectDetection()
  useLandmarkDetection()

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  return (
    <>
      {/* Stipple renders first (replaces background) */}
      <StippleOverlay width={dimensions.width} height={dimensions.height} />

      {/* ASCII renders on top of stipple or original */}
      <AsciiRenderOverlay width={dimensions.width} height={dimensions.height} />

      {/* Point network draws connecting lines */}
      <PointNetworkOverlay width={dimensions.width} height={dimensions.height} />

      {/* Detection boxes render on top */}
      <DetectionOverlay width={dimensions.width} height={dimensions.height} />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/OverlayContainer.tsx
git commit -m "feat: add overlay container with detection hooks"
```

---

### Task 7.8.4: Update Canvas to Include Overlays

**Files:**
- Modify: `src/components/Canvas.tsx`

**Step 1: Add overlay container to canvas component**

Modify `src/components/Canvas.tsx` - add these imports at the top:

```typescript
import { OverlayContainer } from './overlays/OverlayContainer'
```

And wrap the return statement to include overlays:

```typescript
export function Canvas() {
  // ... existing code ...

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black relative"
    >
      {/* Three.js canvas is rendered by useThree hook */}

      {/* Vision effect overlays */}
      <OverlayContainer containerRef={containerRef} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "feat: integrate vision overlays into canvas component"
```

---

### Task 7.8.5: Update App to Include Vision Panel

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add vision panel to sidebar**

Modify `src/App.tsx` to include the VisionPanel:

```typescript
import { Canvas } from './components/Canvas'
import { MediaInputPanel } from './components/MediaInputPanel'
import { GlitchEnginePanel } from './components/effects/GlitchEnginePanel'
import { VisionPanel } from './components/effects/VisionPanel'

function App() {
  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="h-12 border-b border-muted flex items-center justify-between px-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">STRAND-TRACER</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            CAPTURE
          </button>
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            EXPORT
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-muted p-2 flex flex-col gap-2 overflow-y-auto">
          <MediaInputPanel />
          <GlitchEnginePanel />
          <VisionPanel />
        </aside>

        <main className="flex-1">
          <Canvas />
        </main>
      </div>
    </div>
  )
}

export default App
```

**Step 2: Verify full integration**

Run: `npm run dev`

Expected:
- ML Vision panel visible in sidebar
- Detection tab can enable COCO-SSD object detection
- Landmarks tab can enable MediaPipe face/hand/pose tracking
- All effect overlays render when enabled

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add vision panel to app sidebar"
```

---

## Summary: Phase 7 Complete

This phase adds comprehensive ML-powered computer vision capabilities:

**Dependencies Added:**
- `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-webgl` - ML runtime
- `@tensorflow-models/coco-ssd` - Object detection (80 classes)
- `@mediapipe/tasks-vision` - High-density landmark detection

**New Stores:**
- `detectionStore` - Object detection results (bounding boxes, labels, confidence)
- `landmarksStore` - Face, hand, and pose landmark points
- `detectionOverlayStore` - Bounding box rendering settings
- `pointNetworkStore` - Network graph visualization settings
- `asciiRenderStore` - ASCII/Matrix text rendering settings
- `stippleStore` - Particle/dot rendering settings

**New Hooks:**
- `useObjectDetection` - Runs COCO-SSD on video frames
- `useLandmarkDetection` - Runs MediaPipe for point detection

**New Effect Overlays:**
- `DetectionOverlay` - Bounding boxes with labels and glitch effects
- `PointNetworkOverlay` - Curved lines connecting detected landmarks
- `AsciiRenderOverlay` - Matrix-style and standard ASCII rendering
- `StippleOverlay` - Brightness-based particle rendering

**Integration:**
- Overlays render on top of Three.js canvas
- Detection runs in parallel with render loop (~15-30fps)
- Results stored in Zustand, consumed by effects
- Full UI controls in collapsible panel

---

## Priority Implementation Order

For fastest results, implement in this order:

1. **Task 7.1.1-7.1.2**: Install dependencies
2. **Task 7.2.1**: Create detection store
3. **Task 7.3.1**: Create object detection hook
4. **Task 7.4.1-7.4.2**: Create detection overlay (bounding boxes)
5. **Task 7.8.4-7.8.5**: Integrate into app

This gives you working object detection with bounding boxes. Then add:

6. **Task 7.2.2, 7.3.2, 7.5.1-7.5.2**: Landmarks + point network
7. **Task 7.6.1-7.6.3**: ASCII render effect
8. **Task 7.7.1-7.7.2**: Stipple effect
9. **Task 7.8.2-7.8.3**: Complete UI and overlay container

---

*Plan ready for execution. Focus on Tasks 7.1-7.4 first for quick visible progress.*
