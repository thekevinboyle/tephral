import { create } from 'zustand'

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

// Bjorklund's algorithm for euclidean rhythm distribution
function bjorklund(hits: number, steps: number): boolean[] {
  if (hits >= steps) return Array(steps).fill(true)
  if (hits <= 0) return Array(steps).fill(false)

  let pattern: number[][] = []
  let remainder: number[][] = []

  for (let i = 0; i < steps; i++) {
    if (i < hits) {
      pattern.push([1])
    } else {
      remainder.push([0])
    }
  }

  while (remainder.length > 1) {
    const newPattern: number[][] = []
    const minLen = Math.min(pattern.length, remainder.length)

    for (let i = 0; i < minLen; i++) {
      newPattern.push([...pattern[i], ...remainder[i]])
    }

    const leftoverPattern = pattern.slice(minLen)
    const leftoverRemainder = remainder.slice(minLen)

    pattern = newPattern
    remainder = leftoverPattern.length > 0 ? leftoverPattern : leftoverRemainder
  }

  // Flatten and add any remainder
  const result = [...pattern, ...remainder].flat()
  return result.map(v => v === 1)
}

// Rotate pattern by offset
function rotatePattern(pattern: boolean[], offset: number): boolean[] {
  if (offset === 0 || pattern.length === 0) return pattern
  const normalizedOffset = ((offset % pattern.length) + pattern.length) % pattern.length
  return [...pattern.slice(normalizedOffset), ...pattern.slice(0, normalizedOffset)]
}

export const useEuclideanStore = create<EuclideanState>((set, get) => ({
  enabled: false,
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
