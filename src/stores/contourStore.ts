import { create } from 'zustand'

export type DetectionMode = 'brightness' | 'edge' | 'color' | 'motion'
export type FadeMode = 'fade' | 'fixed' | 'persistent'
export type StylePreset = 'technical' | 'neon' | 'brush' | 'minimal'

export interface ContourParams {
  // Detection
  mode: DetectionMode
  threshold: number        // 0-1
  minSize: number          // 0-0.5, ignore smaller contours
  targetColor: string      // for color mode
  colorRange: number       // 0-1, tolerance for color matching

  // Smoothing
  positionSmoothing: number    // 0-1, default 0.6
  contourSimplification: number // 0-1, RDP epsilon

  // Line Style
  baseWidth: number        // 1-10px
  velocityResponse: number // 0-1
  taperAmount: number      // 0-1
  color: string
  glowIntensity: number    // 0-1
  glowColor: string

  // Trails
  trailLength: number      // 0-5 seconds
  fadeMode: FadeMode
}

export const DEFAULT_CONTOUR_PARAMS: ContourParams = {
  mode: 'brightness',
  threshold: 0.5,
  minSize: 0.01,
  targetColor: '#ff0000',
  colorRange: 0.2,

  positionSmoothing: 0.6,
  contourSimplification: 0.5,

  baseWidth: 3,
  velocityResponse: 0.5,
  taperAmount: 0.7,
  color: '#00ffff',
  glowIntensity: 0.5,
  glowColor: '#00ffff',

  trailLength: 2,
  fadeMode: 'fade',
}

const PRESETS: Record<StylePreset, Partial<ContourParams>> = {
  technical: {
    baseWidth: 1,
    velocityResponse: 0,
    taperAmount: 0,
    glowIntensity: 0,
    color: '#ffffff',
  },
  neon: {
    baseWidth: 2,
    velocityResponse: 0.5,
    taperAmount: 0.5,
    glowIntensity: 0.8,
    color: '#00ffff',
    glowColor: '#ff00ff',
  },
  brush: {
    baseWidth: 6,
    velocityResponse: 0.8,
    taperAmount: 0.9,
    glowIntensity: 0.2,
    color: '#ffffff',
  },
  minimal: {
    baseWidth: 1,
    velocityResponse: 0.3,
    taperAmount: 0.5,
    glowIntensity: 0,
    trailLength: 0.5,
    fadeMode: 'fade',
  },
}

interface ContourState {
  enabled: boolean
  params: ContourParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<ContourParams>) => void
  applyPreset: (preset: StylePreset) => void
  reset: () => void
}

export const useContourStore = create<ContourState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_CONTOUR_PARAMS },

  setEnabled: (enabled) => set({ enabled }),

  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),

  applyPreset: (preset) => set((state) => ({
    params: { ...state.params, ...PRESETS[preset] },
  })),

  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_CONTOUR_PARAMS },
  }),
}))
