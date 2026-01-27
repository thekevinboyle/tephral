import { create } from 'zustand'

export type DetectionMode = 'brightness' | 'motion' | 'color'
export type TrailMode = 'fade' | 'fixed' | 'persistent'
export type BlobStyle = 'box' | 'circle' | 'none'
export type ConnectStyle = 'solid' | 'dashed' | 'curved'
export type StylePreset = 'technical' | 'neon' | 'organic'

export interface Blob {
  id: number
  x: number
  y: number
  width: number
  height: number
  age: number
}

export interface TrailPoint {
  x: number
  y: number
  timestamp: number
  blobId: number
}

export interface BlobDetectParams {
  // Detection mode
  mode: DetectionMode

  // Brightness mode
  threshold: number
  invert: boolean

  // Motion mode
  sensitivity: number
  decayRate: number

  // Color mode
  targetHue: number
  hueRange: number
  saturationMin: number
  brightnessMin: number

  // Shared detection
  minSize: number
  maxSize: number
  maxBlobs: number
  smoothing: number
  blurAmount: number

  // Trails
  trailEnabled: boolean
  trailMode: TrailMode
  fadeTime: number
  trailLength: number
  recordInterval: number
  lineWidth: number
  lineColor: string
  lineSmoothness: number
  lineOpacity: number

  // Blob visuals
  blobStyle: BlobStyle
  blobFill: boolean
  blobColor: string
  blobOpacity: number
  blobLineWidth: number

  // Glow
  glowEnabled: boolean
  glowIntensity: number
  glowColor: string

  // Connections
  connectEnabled: boolean
  connectMaxDistance: number
  connectColor: string
  connectWidth: number
  connectStyle: ConnectStyle
}

export const DEFAULT_BLOB_DETECT_PARAMS: BlobDetectParams = {
  mode: 'brightness',

  threshold: 0.5,
  invert: false,

  sensitivity: 0.3,
  decayRate: 0.1,

  targetHue: 0,
  hueRange: 30,
  saturationMin: 0.3,
  brightnessMin: 0.3,

  minSize: 0.01,
  maxSize: 0.5,
  maxBlobs: 20,
  smoothing: 0.5,
  blurAmount: 5,

  trailEnabled: true,
  trailMode: 'fade',
  fadeTime: 2,
  trailLength: 100,
  recordInterval: 33,
  lineWidth: 2,
  lineColor: '#00ffff',
  lineSmoothness: 0.5,
  lineOpacity: 0.8,

  blobStyle: 'circle',
  blobFill: false,
  blobColor: '#00ffff',
  blobOpacity: 1,
  blobLineWidth: 2,

  glowEnabled: true,
  glowIntensity: 0.5,
  glowColor: '#00ffff',

  connectEnabled: false,
  connectMaxDistance: 0.2,
  connectColor: '#ff3366',
  connectWidth: 1,
  connectStyle: 'solid',
}

export interface BlobDetectSnapshot {
  enabled: boolean
  params: BlobDetectParams
}

const PRESETS: Record<StylePreset, Partial<BlobDetectParams>> = {
  technical: {
    blobStyle: 'box',
    blobFill: false,
    blobColor: '#ffffff',
    blobLineWidth: 1,
    lineWidth: 1,
    lineColor: '#ffffff',
    lineSmoothness: 0,
    glowEnabled: false,
    connectStyle: 'solid',
  },
  neon: {
    blobStyle: 'circle',
    blobFill: false,
    blobColor: '#00ffff',
    blobLineWidth: 2,
    lineWidth: 2,
    lineColor: '#ff00ff',
    lineSmoothness: 0.3,
    glowEnabled: true,
    glowIntensity: 0.7,
    glowColor: '#00ffff',
    connectStyle: 'solid',
  },
  organic: {
    blobStyle: 'circle',
    blobFill: true,
    blobColor: '#88ff88',
    blobOpacity: 0.6,
    lineWidth: 3,
    lineColor: '#88ff88',
    lineSmoothness: 1,
    lineOpacity: 0.5,
    glowEnabled: true,
    glowIntensity: 0.3,
    connectStyle: 'curved',
  },
}

interface BlobDetectState {
  enabled: boolean
  params: BlobDetectParams

  // Runtime state
  blobs: Blob[]
  trails: TrailPoint[]

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<BlobDetectParams>) => void
  setMode: (mode: DetectionMode) => void
  applyPreset: (preset: StylePreset) => void
  setBlobs: (blobs: Blob[]) => void
  setTrails: (trails: TrailPoint[]) => void
  clearTrails: () => void
  reset: () => void
  getSnapshot: () => BlobDetectSnapshot
  applySnapshot: (snapshot: BlobDetectSnapshot) => void
}

export const useBlobDetectStore = create<BlobDetectState>((set, get) => ({
  enabled: false,
  params: { ...DEFAULT_BLOB_DETECT_PARAMS },
  blobs: [],
  trails: [],

  setEnabled: (enabled) => set({ enabled }),

  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),

  setMode: (mode) => set((state) => ({
    params: { ...state.params, mode },
  })),

  applyPreset: (preset) => set((state) => ({
    params: { ...state.params, ...PRESETS[preset] },
  })),

  setBlobs: (blobs) => set({ blobs }),

  setTrails: (trails) => set({ trails }),

  clearTrails: () => set({ trails: [] }),

  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_BLOB_DETECT_PARAMS },
    blobs: [],
    trails: [],
  }),

  getSnapshot: () => ({
    enabled: get().enabled,
    params: { ...get().params },
  }),

  applySnapshot: (snapshot) => set({
    enabled: snapshot.enabled,
    params: { ...snapshot.params },
  }),
}))
