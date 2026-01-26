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

export interface LandmarksSnapshot {
  enabled: boolean
  currentMode: LandmarkMode
  minDetectionConfidence: number
  minTrackingConfidence: number
  maxFaces: number
  maxHands: number
  attachToDetections: boolean
}

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
  attachToDetections: boolean  // Render landmarks relative to detected objects

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
  setAttachToDetections: (attach: boolean) => void
  reset: () => void
  getSnapshot: () => LandmarksSnapshot
  applySnapshot: (snapshot: LandmarksSnapshot) => void
}

export const useLandmarksStore = create<LandmarksState>((set, get) => ({
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
  attachToDetections: false,

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
  setAttachToDetections: (attach) => set({ attachToDetections: attach }),
  reset: () => set({
    faces: [],
    hands: [],
    poses: [],
    isRunning: false,
    error: null,
    currentMode: 'off',
    enabled: false,
    attachToDetections: false,
  }),

  getSnapshot: () => {
    const state = get()
    return {
      enabled: state.enabled,
      currentMode: state.currentMode,
      minDetectionConfidence: state.minDetectionConfidence,
      minTrackingConfidence: state.minTrackingConfidence,
      maxFaces: state.maxFaces,
      maxHands: state.maxHands,
      attachToDetections: state.attachToDetections,
    }
  },

  applySnapshot: (snapshot) => set({
    enabled: snapshot.enabled,
    currentMode: snapshot.currentMode,
    minDetectionConfidence: snapshot.minDetectionConfidence,
    minTrackingConfidence: snapshot.minTrackingConfidence,
    maxFaces: snapshot.maxFaces,
    maxHands: snapshot.maxHands,
    attachToDetections: snapshot.attachToDetections,
  }),
}))
