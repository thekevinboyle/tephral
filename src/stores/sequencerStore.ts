import { create } from 'zustand'
import { useEuclideanStore } from './euclideanStore'
import { useRicochetStore } from './ricochetStore'

export type StepMode = 'forward' | 'backward' | 'pendulum' | 'random'
export type StepResolution = '1/4' | '1/8' | '1/16' | '1/32'
export type GateMode = 'trigger' | 'hold'
export type VelocityCurve = 'up' | 'down' | 'flat' | 'triangle'
export type RatchetDivision = 1 | 2 | 3 | 4 | 6 | 8

export interface Step {
  active: boolean
  probability: number
  gateLength: number
  gateLengthVariation: number
  variationRange: number
  ratchetDivision: RatchetDivision
  ratchetProbability: number
  velocityCurve: VelocityCurve
  timingSkew: number
}

export interface Track {
  id: string
  name: string
  color: string
  length: number
  modeOverride: StepMode | null
  steps: Step[]
  solo: boolean
  currentStep: number
  direction: 1 | -1  // For pendulum mode
}

export interface Routing {
  id: string
  trackId: string
  targetParam: string
  depth: number
}

export interface SequencerSnapshot {
  tracks: Track[]
  routings: Routing[]
}

interface SequencerState {
  // Transport
  isPlaying: boolean
  bpm: number
  stepResolution: StepResolution
  gateMode: GateMode

  // Global settings
  globalMode: StepMode
  fillModeActive: boolean

  // Tracks
  tracks: Track[]

  // Snapshot
  frozenState: SequencerSnapshot | null

  // Routings
  routings: Routing[]

  // Undo for randomize
  previousStepsSnapshot: Track[] | null

  // Audio reactive
  audioReactive: boolean
  audioLevel: number

  // Assignment mode - which track is being routed to parameters
  assigningTrack: string | null
  setAssigningTrack: (trackId: string | null) => void
  toggleAssignmentMode: (trackId: string) => void

  // Transport actions
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setStepResolution: (resolution: StepResolution) => void
  setGateMode: (mode: GateMode) => void

  // Global setting actions
  setGlobalMode: (mode: StepMode) => void
  setFillModeActive: (active: boolean) => void

  // Track actions
  addTrack: () => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<Pick<Track, 'name' | 'color' | 'length' | 'modeOverride' | 'solo'>>) => void
  reorderTracks: (fromIndex: number, toIndex: number) => void
  setTrackLength: (trackId: string, length: number) => void

  // Step actions
  toggleStep: (trackId: string, stepIndex: number) => void
  updateStep: (trackId: string, stepIndex: number, updates: Partial<Step>) => void
  fillTrack: (trackId: string) => void
  clearTrack: (trackId: string) => void
  randomizeTrack: (trackId: string) => void
  randomizeAllTracks: () => void
  undoRandomize: () => void

  // Routing actions
  addRouting: (trackId: string, targetParam: string, depth?: number) => void
  removeRouting: (routingId: string) => void
  updateRoutingDepth: (routingId: string, depth: number) => void
  getRoutingsForTrack: (trackId: string) => Routing[]
  getRoutingsForParam: (targetParam: string) => Routing[]

  // Snapshot actions
  freeze: () => void
  revert: () => void

  // Playback state
  advanceStep: () => void
  getCurrentValues: () => Map<string, number>

  // Audio reactive actions
  setAudioReactive: (active: boolean) => void
  setAudioLevel: (level: number) => void
}

const TRACK_COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#FFE66D', // yellow
  '#95E1D3', // mint
  '#F38181', // salmon
  '#AA96DA', // lavender
  '#FCBAD3', // pink
  '#A8D8EA', // sky blue
]

const createDefaultStep = (): Step => ({
  active: false,
  probability: 1,
  gateLength: 1,
  gateLengthVariation: 0,
  variationRange: 0.5,
  ratchetDivision: 1,
  ratchetProbability: 1,
  velocityCurve: 'flat',
  timingSkew: 0,
})

const createDefaultTrack = (id: string, index: number): Track => ({
  id,
  name: `Track ${index + 1}`,
  color: TRACK_COLORS[index % TRACK_COLORS.length],
  length: 16,
  modeOverride: null,
  steps: Array.from({ length: 64 }, createDefaultStep),
  solo: false,
  currentStep: 0,
  direction: 1,
})

let trackIdCounter = 0

export const useSequencerStore = create<SequencerState>((set, get) => ({
  // Transport
  isPlaying: false,
  bpm: 120,
  stepResolution: '1/16',
  gateMode: 'trigger',

  // Global settings
  globalMode: 'forward',
  fillModeActive: false,

  // Tracks
  tracks: [],

  // Snapshot
  frozenState: null,

  // Routings
  routings: [],

  // Undo
  previousStepsSnapshot: null,

  // Audio reactive
  audioReactive: false,
  audioLevel: 0,

  // Assignment mode
  assigningTrack: null,
  setAssigningTrack: (trackId) => set({ assigningTrack: trackId }),
  toggleAssignmentMode: (trackId) => set((state) => ({
    assigningTrack: state.assigningTrack === trackId ? null : trackId
  })),

  // Transport actions
  play: () => set({ isPlaying: true }),
  stop: () => {
    // Reset all track positions
    set((state) => ({
      isPlaying: false,
      tracks: state.tracks.map((track) => ({
        ...track,
        currentStep: 0,
        direction: 1,
      })),
    }))
  },
  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),
  setStepResolution: (resolution) => set({ stepResolution: resolution }),
  setGateMode: (mode) => set({ gateMode: mode }),

  // Global setting actions
  setGlobalMode: (mode) => set({ globalMode: mode }),
  setFillModeActive: (active) => set({ fillModeActive: active }),

  // Track actions
  addTrack: () => {
    const id = `track_${++trackIdCounter}`
    set((state) => ({
      tracks: [...state.tracks, createDefaultTrack(id, state.tracks.length)],
    }))
  },

  removeTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
      routings: state.routings.filter((r) => r.trackId !== trackId),
    }))
  },

  updateTrack: (trackId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, ...updates } : track
      ),
    }))
  },

  reorderTracks: (fromIndex, toIndex) => {
    set((state) => {
      const tracks = [...state.tracks]
      const [removed] = tracks.splice(fromIndex, 1)
      tracks.splice(toIndex, 0, removed)
      return { tracks }
    })
  },

  setTrackLength: (trackId, length) => {
    const clampedLength = Math.max(4, Math.min(64, length))
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, length: clampedLength, currentStep: Math.min(track.currentStep, clampedLength - 1) }
          : track
      ),
    }))
  },

  // Step actions
  toggleStep: (trackId, stepIndex) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i === stepIndex ? { ...step, active: !step.active } : step
              ),
            }
          : track
      ),
    }))
  },

  updateStep: (trackId, stepIndex, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i === stepIndex ? { ...step, ...updates } : step
              ),
            }
          : track
      ),
    }))
  },

  fillTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i < track.length ? { ...step, active: true } : step
              ),
            }
          : track
      ),
    }))
  },

  clearTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step) => ({ ...step, active: false })),
            }
          : track
      ),
    }))
  },

  randomizeTrack: (trackId) => {
    const state = get()
    set({
      previousStepsSnapshot: state.tracks,
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, i) =>
                i < track.length
                  ? { ...step, active: Math.random() > 0.5 }
                  : step
              ),
            }
          : track
      ),
    })
  },

  randomizeAllTracks: () => {
    const state = get()
    set({
      previousStepsSnapshot: state.tracks,
      tracks: state.tracks.map((track) => ({
        ...track,
        steps: track.steps.map((step, i) =>
          i < track.length ? { ...step, active: Math.random() > 0.5 } : step
        ),
      })),
    })
  },

  undoRandomize: () => {
    const { previousStepsSnapshot } = get()
    if (previousStepsSnapshot) {
      set({ tracks: previousStepsSnapshot, previousStepsSnapshot: null })
    }
  },

  // Routing actions
  addRouting: (trackId, targetParam, depth = 0.5) => {
    const id = `routing_${Date.now()}_${Math.random().toString(36).slice(2)}`
    set((state) => ({
      routings: [...state.routings, { id, trackId, targetParam, depth }],
    }))
  },

  removeRouting: (routingId) => {
    set((state) => ({
      routings: state.routings.filter((r) => r.id !== routingId),
    }))
  },

  updateRoutingDepth: (routingId, depth) => {
    set((state) => ({
      routings: state.routings.map((r) =>
        r.id === routingId ? { ...r, depth: Math.max(-1, Math.min(1, depth)) } : r
      ),
    }))
  },

  getRoutingsForTrack: (trackId) => {
    return get().routings.filter((r) => r.trackId === trackId)
  },

  getRoutingsForParam: (targetParam) => {
    return get().routings.filter((r) => r.targetParam === targetParam)
  },

  // Snapshot actions
  freeze: () => {
    const { tracks, routings } = get()
    set({
      frozenState: {
        tracks: JSON.parse(JSON.stringify(tracks)),
        routings: JSON.parse(JSON.stringify(routings)),
      },
    })
  },

  revert: () => {
    const { frozenState } = get()
    if (frozenState) {
      set({
        tracks: frozenState.tracks,
        routings: frozenState.routings,
      })
    }
  },

  // Playback
  advanceStep: () => {
    set((state) => ({
      tracks: state.tracks.map((track) => {
        const mode = track.modeOverride ?? state.globalMode
        let { currentStep, direction } = track
        const maxStep = track.length - 1

        switch (mode) {
          case 'forward':
            currentStep = (currentStep + 1) % track.length
            break
          case 'backward':
            currentStep = currentStep === 0 ? maxStep : currentStep - 1
            break
          case 'pendulum':
            currentStep += direction
            if (currentStep >= maxStep) {
              currentStep = maxStep
              direction = -1
            } else if (currentStep <= 0) {
              currentStep = 0
              direction = 1
            }
            break
          case 'random':
            currentStep = Math.floor(Math.random() * track.length)
            break
        }

        return { ...track, currentStep, direction }
      }),
    }))
  },

  getCurrentValues: () => {
    const { tracks, routings, gateMode, audioReactive, audioLevel } = get()
    const values = new Map<string, number>()

    // If audio reactive mode, use audio level directly for all routings
    if (audioReactive) {
      for (const routing of routings) {
        const modulatedValue = audioLevel * routing.depth
        const existing = values.get(routing.targetParam) ?? 0
        values.set(routing.targetParam, Math.max(-1, Math.min(1, existing + modulatedValue)))
      }
      return values
    }

    // Check for solo tracks
    const hasSolo = tracks.some((t) => t.solo)

    for (const routing of routings) {
      // Handle special sources (euclidean, ricochet, etc.)
      if (routing.trackId === 'euclidean') {
        const euclidean = useEuclideanStore.getState()
        if (euclidean.enabled) {
          const modulatedValue = euclidean.currentValue * routing.depth
          const existing = values.get(routing.targetParam) ?? 0
          values.set(routing.targetParam, Math.max(-1, Math.min(1, existing + modulatedValue)))
        }
        continue
      }

      if (routing.trackId === 'ricochet') {
        const ricochet = useRicochetStore.getState()
        if (ricochet.enabled) {
          const modulatedValue = ricochet.currentValue * routing.depth
          const existing = values.get(routing.targetParam) ?? 0
          values.set(routing.targetParam, Math.max(-1, Math.min(1, existing + modulatedValue)))
        }
        continue
      }

      // Handle regular sequencer tracks
      const track = tracks.find((t) => t.id === routing.trackId)
      if (!track) continue

      // Skip if another track is soloed and this one isn't
      if (hasSolo && !track.solo) continue

      const step = track.steps[track.currentStep]
      if (!step) continue

      // Calculate if step fires based on probability
      const fires = step.active && Math.random() < step.probability

      let value = 0
      if (fires) {
        // Apply ratchet probability
        const ratchetFires = Math.random() < step.ratchetProbability
        if (ratchetFires && step.ratchetDivision > 1) {
          // Ratcheting would subdivide the step
          value = 1
        } else if (fires) {
          value = 1
        }
      } else if (gateMode === 'hold') {
        // In hold mode, maintain previous value (handled by consumer)
        continue
      }

      // Apply depth modulation
      const modulatedValue = value * routing.depth

      // Accumulate values for same parameter
      const existing = values.get(routing.targetParam) ?? 0
      values.set(routing.targetParam, Math.max(-1, Math.min(1, existing + modulatedValue)))
    }

    return values
  },

  // Audio reactive actions
  setAudioReactive: (active) => set({ audioReactive: active }),
  setAudioLevel: (level) => set({ audioLevel: level }),
}))
