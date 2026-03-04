import { create } from 'zustand'
import { bjorklund, rotatePattern } from '../utils/bjorklund'

export interface EuclideanState {
  // Enabled state
  enabled: boolean
  setEnabled: (enabled: boolean) => void

  // Pattern parameters
  steps: number
  hits: number
  rotation: number
  decay: number // 0-1, how fast output falls after trigger

  // Playback
  syncMode: 'sync' | 'free'
  freeRate: number // Hz when in free mode
  currentStep: number

  // Output
  currentValue: number // 0-1, the modulation output

  // Actions
  setSteps: (steps: number) => void
  setHits: (hits: number) => void
  setRotation: (rotation: number) => void
  setDecay: (decay: number) => void
  setSyncMode: (mode: 'sync' | 'free') => void
  setFreeRate: (rate: number) => void
  setCurrentStep: (step: number) => void
  setCurrentValue: (value: number) => void

  // Computed pattern
  getPattern: () => boolean[]
}


export const useEuclideanStore = create<EuclideanState>((set, get) => ({
  enabled: true, // Always enabled - this is a modulation source, not an effect
  setEnabled: (enabled) => set({ enabled }),

  steps: 16,
  hits: 4,
  rotation: 0,
  decay: 0.5,

  syncMode: 'free',
  freeRate: 2, // 2 Hz default
  currentStep: 0,
  currentValue: 0,

  setSteps: (steps) => {
    const clamped = Math.max(4, Math.min(32, steps))
    const state = get()
    // Ensure hits doesn't exceed steps
    const newHits = Math.min(state.hits, clamped)
    // Ensure rotation doesn't exceed steps
    const newRotation = Math.min(state.rotation, clamped - 1)
    set({ steps: clamped, hits: newHits, rotation: newRotation })
  },

  setHits: (hits) => {
    const state = get()
    set({ hits: Math.max(0, Math.min(state.steps, hits)) })
  },

  setRotation: (rotation) => {
    const state = get()
    set({ rotation: Math.max(0, Math.min(state.steps - 1, rotation)) })
  },

  setDecay: (decay) => set({ decay: Math.max(0, Math.min(1, decay)) }),

  setSyncMode: (mode) => set({ syncMode: mode }),
  setFreeRate: (rate) => set({ freeRate: Math.max(0.1, Math.min(20, rate)) }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setCurrentValue: (value) => set({ currentValue: Math.max(0, Math.min(1, value)) }),

  getPattern: () => {
    const { steps, hits, rotation } = get()
    const basePattern = bjorklund(hits, steps)
    return rotatePattern(basePattern, rotation)
  },
}))
