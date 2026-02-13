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
  // Shape options
  boxShape: 'circle' | 'square' | 'dynamic'  // circle=ellipse, square=rect, dynamic=based on compactness
  lineStyle: 'straight' | 'web'  // straight=direct lines, web=kojima-style curved strands
}

// GPU trace effect params (for TouchDesigner-style tracing with trails)
export interface TraceEffectParams {
  trailEnabled: boolean       // whether trail persistence is enabled
  trailDecay: number          // 0-1: how quickly trails fade (higher = faster fade)
  outputMode: 'overlay' | 'mask'  // show effect or just output mask
}

export interface ColorTraceExtendedParams extends TraceEffectParams {
  targetHue: number           // 0-1: target hue to track
  hueRange: number            // 0-0.5: hue variation tolerance
  satMin: number              // 0-1: minimum saturation required
  valMin: number              // 0-1: minimum brightness required
}

export interface MotionTraceExtendedParams extends TraceEffectParams {
  sensitivity: number         // 1-10: motion amplification
}

export interface LandmarkTraceParams extends TraceEffectParams {
  feather: number             // 0-0.5: edge feathering
  fillMode: string            // depends on effect type
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
  boxShape: 'square',
  lineStyle: 'straight',
}

const DEFAULT_TRACE_EFFECT_PARAMS: TraceEffectParams = {
  trailEnabled: true,
  trailDecay: 0.95,
  outputMode: 'overlay',
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

  // Per-mode parameters (legacy overlay tracking)
  brightParams: TrackingModeParams
  edgeParams: TrackingModeParams
  colorParams: TrackingModeParams & { targetColor: string; colorRange: number }
  motionParams: TrackingModeParams & { sensitivity: number }
  faceParams: TrackingModeParams
  handsParams: TrackingModeParams

  // GPU trace effect params (TouchDesigner-style tracing)
  brightTraceParams: TraceEffectParams
  edgeTraceParams: TraceEffectParams
  colorTraceParams: ColorTraceExtendedParams
  motionTraceParams: MotionTraceExtendedParams
  faceTraceParams: LandmarkTraceParams
  handsTraceParams: LandmarkTraceParams

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

  // GPU trace param updaters
  updateBrightTraceParams: (params: Partial<TraceEffectParams>) => void
  updateEdgeTraceParams: (params: Partial<TraceEffectParams>) => void
  updateColorTraceParams: (params: Partial<ColorTraceExtendedParams>) => void
  updateMotionTraceParams: (params: Partial<MotionTraceExtendedParams>) => void
  updateFaceTraceParams: (params: Partial<LandmarkTraceParams>) => void
  updateHandsTraceParams: (params: Partial<LandmarkTraceParams>) => void
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

  // GPU trace effect params
  brightTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
  },
  edgeTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
  },
  colorTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
    targetHue: 0.0,      // Default to red
    hueRange: 0.1,       // ±10% hue tolerance
    satMin: 0.3,         // Require some saturation
    valMin: 0.2,         // Require some brightness
  },
  motionTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
    sensitivity: 3.0,
  },
  faceTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
    feather: 0.02,
    fillMode: 'oval',
  },
  handsTraceParams: {
    ...DEFAULT_TRACE_EFFECT_PARAMS,
    feather: 0.02,
    fillMode: 'hull',
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

  // GPU trace param updaters
  updateBrightTraceParams: (params) => set((state) => ({
    brightTraceParams: { ...state.brightTraceParams, ...params },
  })),
  updateEdgeTraceParams: (params) => set((state) => ({
    edgeTraceParams: { ...state.edgeTraceParams, ...params },
  })),
  updateColorTraceParams: (params) => set((state) => ({
    colorTraceParams: { ...state.colorTraceParams, ...params },
  })),
  updateMotionTraceParams: (params) => set((state) => ({
    motionTraceParams: { ...state.motionTraceParams, ...params },
  })),
  updateFaceTraceParams: (params) => set((state) => ({
    faceTraceParams: { ...state.faceTraceParams, ...params },
  })),
  updateHandsTraceParams: (params) => set((state) => ({
    handsTraceParams: { ...state.handsTraceParams, ...params },
  })),
}))
