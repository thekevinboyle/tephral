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
