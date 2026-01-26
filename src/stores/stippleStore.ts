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

export interface StippleSnapshot {
  enabled: boolean
  params: StippleParams
}

interface StippleState {
  enabled: boolean
  params: StippleParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<StippleParams>) => void
  reset: () => void
  getSnapshot: () => StippleSnapshot
  applySnapshot: (snapshot: StippleSnapshot) => void
}

export const useStippleStore = create<StippleState>((set, get) => ({
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

  getSnapshot: () => ({
    enabled: get().enabled,
    params: { ...get().params },
  }),

  applySnapshot: (snapshot) => set({
    enabled: snapshot.enabled,
    params: { ...snapshot.params },
  }),
}))
