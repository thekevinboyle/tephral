import { create } from 'zustand'

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

  const result = [...pattern, ...remainder].flat()
  return result.map(v => v === 1)
}

function rotatePattern(pattern: boolean[], offset: number): boolean[] {
  if (offset === 0 || pattern.length === 0) return pattern
  const normalizedOffset = ((offset % pattern.length) + pattern.length) % pattern.length
  return [...pattern.slice(normalizedOffset), ...pattern.slice(0, normalizedOffset)]
}

export interface PolyEuclidTrack {
  id: string
  steps: number        // 2-16
  hits: number         // 1 to steps
  rotation: number     // 0 to steps-1
  clockDivider: number // 0.25, 0.5, 1, 2, 4
  decay: number        // 0-1
  muted: boolean
  currentStep: number
  currentValue: number // 0-1 output for modulation
  angle: number        // diagonal angle in degrees
}

interface PolyEuclidState {
  tracks: PolyEuclidTrack[]
  maxTracks: number

  // Assignment mode - which track is being routed to parameters
  assigningTrack: string | null
  setAssigningTrack: (trackId: string | null) => void
  toggleAssignmentMode: (trackId: string) => void

  addTrack: () => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<PolyEuclidTrack>) => void
  setCurrentStep: (id: string, step: number) => void
  setCurrentValue: (id: string, value: number) => void
  getPattern: (id: string) => boolean[]
}

// Track angles for diagonal cascade effect
const TRACK_ANGLES = [-60, -30, 30, 60, -45, 45, -15, 15]

function createTrack(index: number): PolyEuclidTrack {
  return {
    id: `track-${index}-${Date.now()}`,
    steps: 8,
    hits: 3,
    rotation: 0,
    clockDivider: 1,
    decay: 0.5,
    muted: false,
    currentStep: 0,
    currentValue: 0,
    angle: TRACK_ANGLES[index % TRACK_ANGLES.length],
  }
}

export const usePolyEuclidStore = create<PolyEuclidState>((set, get) => ({
  tracks: [
    createTrack(0),
    createTrack(1),
    createTrack(2),
    createTrack(3),
  ],
  maxTracks: 8,

  // Assignment mode
  assigningTrack: null,
  setAssigningTrack: (trackId) => set({ assigningTrack: trackId }),
  toggleAssignmentMode: (trackId) => set((state) => ({
    assigningTrack: state.assigningTrack === trackId ? null : trackId
  })),

  addTrack: () => {
    const { tracks, maxTracks } = get()
    if (tracks.length >= maxTracks) return
    set({ tracks: [...tracks, createTrack(tracks.length)] })
  },

  removeTrack: (id) => {
    const { tracks } = get()
    if (tracks.length <= 1) return
    set({ tracks: tracks.filter(t => t.id !== id) })
  },

  updateTrack: (id, updates) => {
    set(state => ({
      tracks: state.tracks.map(t => {
        if (t.id !== id) return t
        const updated = { ...t, ...updates }
        // Clamp values
        updated.steps = Math.max(2, Math.min(16, updated.steps))
        updated.hits = Math.max(1, Math.min(updated.steps, updated.hits))
        updated.rotation = Math.max(0, Math.min(updated.steps - 1, updated.rotation))
        updated.clockDivider = Math.max(0.25, Math.min(4, updated.clockDivider))
        updated.decay = Math.max(0, Math.min(1, updated.decay))
        return updated
      })
    }))
  },

  setCurrentStep: (id, step) => {
    set(state => ({
      tracks: state.tracks.map(t =>
        t.id === id ? { ...t, currentStep: step } : t
      )
    }))
  },

  setCurrentValue: (id, value) => {
    set(state => ({
      tracks: state.tracks.map(t =>
        t.id === id ? { ...t, currentValue: Math.max(0, Math.min(1, value)) } : t
      )
    }))
  },

  getPattern: (id) => {
    const track = get().tracks.find(t => t.id === id)
    if (!track) return []
    const basePattern = bjorklund(track.hits, track.steps)
    return rotatePattern(basePattern, track.rotation)
  },
}))
