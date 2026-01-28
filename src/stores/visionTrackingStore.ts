import { create } from 'zustand'

export interface TrackingModeParams {
  threshold: number      // 0-255 for bright/edge, 0-1 for others
  minSize: number        // minimum blob size in pixels
  maxBlobs: number       // max number of blobs to track
  showBoxes: boolean
  showLines: boolean
  showLabels: boolean
  boxColor: string
  lineColor: string
  // Box filter effect
  boxFilter: 'none' | 'pixel' | 'invert' | 'blur' | 'thermal' | 'edge' | 'grayscale' | 'saturate'
  boxFilterIntensity: number  // 0-100
}

const DEFAULT_PARAMS: TrackingModeParams = {
  threshold: 128,
  minSize: 20,
  maxBlobs: 30,
  showBoxes: true,
  showLines: true,
  showLabels: true,
  boxColor: 'rgba(255, 200, 100, 0.8)',
  lineColor: 'rgba(255, 255, 255, 0.7)',
  boxFilter: 'none',
  boxFilterIntensity: 50,
}

interface VisionTrackingState {
  // Blob tracking modes
  brightEnabled: boolean
  edgeEnabled: boolean
  colorEnabled: boolean
  motionEnabled: boolean

  // Skin-tone based tracking modes
  faceEnabled: boolean
  handsEnabled: boolean

  // Global display options
  linesOnly: boolean  // Black out video, show only tracking lines/boxes

  // Per-mode parameters
  brightParams: TrackingModeParams
  edgeParams: TrackingModeParams
  colorParams: TrackingModeParams & { targetColor: string; colorRange: number }
  motionParams: TrackingModeParams & { sensitivity: number }
  faceParams: TrackingModeParams
  handsParams: TrackingModeParams

  // Actions
  setBrightEnabled: (enabled: boolean) => void
  setEdgeEnabled: (enabled: boolean) => void
  setColorEnabled: (enabled: boolean) => void
  setMotionEnabled: (enabled: boolean) => void
  setFaceEnabled: (enabled: boolean) => void
  setHandsEnabled: (enabled: boolean) => void
  setLinesOnly: (enabled: boolean) => void

  updateBrightParams: (params: Partial<TrackingModeParams>) => void
  updateEdgeParams: (params: Partial<TrackingModeParams>) => void
  updateColorParams: (params: Partial<TrackingModeParams & { targetColor: string; colorRange: number }>) => void
  updateMotionParams: (params: Partial<TrackingModeParams & { sensitivity: number }>) => void
  updateFaceParams: (params: Partial<TrackingModeParams>) => void
  updateHandsParams: (params: Partial<TrackingModeParams>) => void
}

export const useVisionTrackingStore = create<VisionTrackingState>((set) => ({
  // Initial states - all disabled
  brightEnabled: false,
  edgeEnabled: false,
  colorEnabled: false,
  motionEnabled: false,
  faceEnabled: false,
  handsEnabled: false,
  linesOnly: false,

  // Default parameters - all white
  brightParams: {
    ...DEFAULT_PARAMS,
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
  },
  edgeParams: {
    ...DEFAULT_PARAMS,
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
  },
  colorParams: {
    ...DEFAULT_PARAMS,
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
    targetColor: '#ff0000',
    colorRange: 0.3,
  },
  motionParams: {
    ...DEFAULT_PARAMS,
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
    sensitivity: 30,
  },
  faceParams: {
    ...DEFAULT_PARAMS,
    threshold: 50,  // Skin tone sensitivity (0-100)
    minSize: 50,    // Larger min size for faces
    maxBlobs: 5,    // Fewer blobs for faces
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
  },
  handsParams: {
    ...DEFAULT_PARAMS,
    threshold: 50,  // Skin tone sensitivity (0-100)
    minSize: 15,    // Smaller min size for hands
    maxBlobs: 10,   // More blobs for hands
    boxColor: 'rgba(255, 255, 255, 0.8)',
    lineColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Setters
  setBrightEnabled: (enabled) => set({ brightEnabled: enabled }),
  setEdgeEnabled: (enabled) => set({ edgeEnabled: enabled }),
  setColorEnabled: (enabled) => set({ colorEnabled: enabled }),
  setMotionEnabled: (enabled) => set({ motionEnabled: enabled }),
  setFaceEnabled: (enabled) => set({ faceEnabled: enabled }),
  setHandsEnabled: (enabled) => set({ handsEnabled: enabled }),
  setLinesOnly: (enabled) => set({ linesOnly: enabled }),

  // Param updaters
  updateBrightParams: (params) => set((state) => ({
    brightParams: { ...state.brightParams, ...params },
  })),
  updateEdgeParams: (params) => set((state) => ({
    edgeParams: { ...state.edgeParams, ...params },
  })),
  updateColorParams: (params) => set((state) => ({
    colorParams: { ...state.colorParams, ...params },
  })),
  updateMotionParams: (params) => set((state) => ({
    motionParams: { ...state.motionParams, ...params },
  })),
  updateFaceParams: (params) => set((state) => ({
    faceParams: { ...state.faceParams, ...params },
  })),
  updateHandsParams: (params) => set((state) => ({
    handsParams: { ...state.handsParams, ...params },
  })),
}))
