import { create } from 'zustand'
import { useMediaStore } from './mediaStore'

// Types
export type CaptureState = 'live' | 'frozen' | 'imported'
export type GrainDirection = 'forward' | 'reverse' | 'random'
export type OutputMode = 'replace' | 'mix' | 'layer'
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'difference' | 'overlay'
export type SliceSequenceMode = 'forward' | 'reverse' | 'pendulum' | 'random'

// Grain parameters interface for bulk updates
export interface GrainParams {
  grainSize: number
  density: number
  spray: number
  jitter: number
  rate: number
  direction: GrainDirection
  reverseProb: number
  envelope: number
}

// Snapshot interface for presets (excludes runtime state)
export interface SlicerSnapshot {
  // Buffer
  bufferSize: number

  // Slices
  sliceCount: 4 | 8 | 16 | 32
  sliceSequenceMode: SliceSequenceMode

  // Grains
  grainSize: number
  density: number
  spray: number
  jitter: number
  rate: number
  direction: GrainDirection
  reverseProb: number
  envelope: number

  // Playback
  sliceProb: number
  syncToBpm: boolean
  triggerRate: number

  // Output
  outputMode: OutputMode
  wet: number
  blendMode: BlendMode
  opacity: number
  enabled: boolean
}

interface SlicerState {
  // Buffer
  bufferSize: number
  captureState: CaptureState
  importedClipId: string | null

  // Slices
  sliceCount: 4 | 8 | 16 | 32
  currentSlice: number
  sliceSequenceMode: SliceSequenceMode

  // Playhead (0-1 position within current slice for visualization)
  playheadPosition: number
  // Scan position (0-1 user-controllable read position within slice)
  scanPosition: number
  // Auto-scan: automatically sweep scanPosition through the slice
  autoScan: boolean
  scanSpeed: number  // Speed in Hz (cycles per second through the slice)
  scanMode: 'loop' | 'pendulum'  // Loop = wrap around, Pendulum = bounce back

  // Grains
  grainSize: number
  density: number
  spray: number
  jitter: number
  rate: number
  direction: GrainDirection
  reverseProb: number
  envelope: number

  // Playback
  isPlaying: boolean
  sliceProb: number
  freeze: boolean
  syncToBpm: boolean
  triggerRate: number

  // Output
  outputMode: OutputMode
  wet: number
  blendMode: BlendMode
  opacity: number
  enabled: boolean
  processEffects: boolean  // Whether slicer output goes through effects chain

  // Buffer actions
  setBufferSize: (size: number) => void
  setCaptureState: (state: CaptureState) => void
  setImportedClipId: (id: string | null) => void

  // Slice actions
  setSliceCount: (count: 4 | 8 | 16 | 32) => void
  setCurrentSlice: (slice: number) => void
  setSliceSequenceMode: (mode: SliceSequenceMode) => void
  setPlayheadPosition: (position: number) => void
  setScanPosition: (position: number) => void
  setAutoScan: (autoScan: boolean) => void
  setScanSpeed: (speed: number) => void
  setScanMode: (mode: 'loop' | 'pendulum') => void

  // Grain actions
  setGrainSize: (size: number) => void
  setDensity: (density: number) => void
  setSpray: (spray: number) => void
  setJitter: (jitter: number) => void
  setRate: (rate: number) => void
  setDirection: (direction: GrainDirection) => void
  setReverseProb: (prob: number) => void
  setEnvelope: (envelope: number) => void
  updateGrainParams: (params: Partial<GrainParams>) => void

  // Playback actions
  setIsPlaying: (playing: boolean) => void
  setSliceProb: (prob: number) => void
  setFreeze: (freeze: boolean) => void
  setSyncToBpm: (sync: boolean) => void
  setTriggerRate: (rate: number) => void

  // Output actions
  setOutputMode: (mode: OutputMode) => void
  setWet: (wet: number) => void
  setBlendMode: (mode: BlendMode) => void
  setOpacity: (opacity: number) => void
  setEnabled: (enabled: boolean) => void
  setProcessEffects: (process: boolean) => void

  // Snapshot actions
  getSnapshot: () => SlicerSnapshot
  loadSnapshot: (snapshot: SlicerSnapshot) => void
}

// Clamping helpers
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const useSlicerStore = create<SlicerState>((set, get) => ({
  // Buffer defaults
  bufferSize: 4,
  captureState: 'live',
  importedClipId: null,

  // Slice defaults
  sliceCount: 8,
  currentSlice: 0,
  sliceSequenceMode: 'forward',
  playheadPosition: 0,
  scanPosition: 0.5,
  autoScan: false,
  scanSpeed: 0.5,  // 0.5 Hz = 2 seconds per cycle
  scanMode: 'pendulum',

  // Grain defaults
  grainSize: 100,
  density: 2,
  spray: 0.2,
  jitter: 0.1,
  rate: 1,
  direction: 'forward',
  reverseProb: 0,
  envelope: 20,

  // Playback defaults
  isPlaying: false,
  sliceProb: 1,
  freeze: false,
  syncToBpm: true,
  triggerRate: 4,

  // Output defaults
  outputMode: 'replace',
  wet: 1,
  blendMode: 'normal',
  opacity: 1,
  enabled: false,
  processEffects: false,  // Bypass effects by default

  // Buffer actions
  setBufferSize: (size) => set({ bufferSize: clamp(size, 1, 10) }),
  setCaptureState: (captureState) => set({ captureState }),
  setImportedClipId: (importedClipId) => set({ importedClipId }),

  // Slice actions
  setSliceCount: (sliceCount) => {
    set((state) => ({
      sliceCount,
      currentSlice: Math.min(state.currentSlice, sliceCount - 1),
    }))
  },
  setCurrentSlice: (slice) => {
    set((state) => ({
      currentSlice: clamp(slice, 0, state.sliceCount - 1),
    }))
  },
  setSliceSequenceMode: (sliceSequenceMode) => set({ sliceSequenceMode }),
  setPlayheadPosition: (playheadPosition) => set({ playheadPosition: clamp(playheadPosition, 0, 1) }),
  setScanPosition: (scanPosition) => set({ scanPosition: clamp(scanPosition, 0, 1) }),
  setAutoScan: (autoScan) => set({ autoScan }),
  setScanSpeed: (scanSpeed) => set({ scanSpeed: clamp(scanSpeed, 0.1, 10) }),
  setScanMode: (scanMode) => set({ scanMode }),

  // Grain actions
  setGrainSize: (size) => set({ grainSize: clamp(size, 10, 500) }),
  setDensity: (density) => set({ density: clamp(density, 1, 8) }),
  setSpray: (spray) => set({ spray: clamp(spray, 0, 1) }),
  setJitter: (jitter) => set({ jitter: clamp(jitter, 0, 1) }),
  setRate: (rate) => set({ rate: clamp(rate, 0.25, 4) }),
  setDirection: (direction) => set({ direction }),
  setReverseProb: (reverseProb) => set({ reverseProb: clamp(reverseProb, 0, 1) }),
  setEnvelope: (envelope) => set({ envelope: clamp(envelope, 0, 100) }),

  updateGrainParams: (params) => {
    set((state) => {
      const updates: Partial<GrainParams> = {}

      if (params.grainSize !== undefined) {
        updates.grainSize = clamp(params.grainSize, 10, 500)
      }
      if (params.density !== undefined) {
        updates.density = clamp(params.density, 1, 8)
      }
      if (params.spray !== undefined) {
        updates.spray = clamp(params.spray, 0, 1)
      }
      if (params.jitter !== undefined) {
        updates.jitter = clamp(params.jitter, 0, 1)
      }
      if (params.rate !== undefined) {
        updates.rate = clamp(params.rate, 0.25, 4)
      }
      if (params.direction !== undefined) {
        updates.direction = params.direction
      }
      if (params.reverseProb !== undefined) {
        updates.reverseProb = clamp(params.reverseProb, 0, 1)
      }
      if (params.envelope !== undefined) {
        updates.envelope = clamp(params.envelope, 0, 100)
      }

      return { ...state, ...updates }
    })
  },

  // Playback actions
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSliceProb: (sliceProb) => set({ sliceProb: clamp(sliceProb, 0, 1) }),
  setFreeze: (freeze) => set({ freeze }),
  setSyncToBpm: (syncToBpm) => set({ syncToBpm }),
  setTriggerRate: (triggerRate) => set({ triggerRate: Math.max(0.1, triggerRate) }),

  // Output actions
  setOutputMode: (outputMode) => set({ outputMode }),
  setWet: (wet) => set({ wet: clamp(wet, 0, 1) }),
  setBlendMode: (blendMode) => set({ blendMode }),
  setOpacity: (opacity) => set({ opacity: clamp(opacity, 0, 1) }),
  setEnabled: (enabled) => {
    set({ enabled })
    // Coordinate with mediaStore
    if (enabled) {
      // Stash current source and switch to slicer
      useMediaStore.getState().stashCurrentSource()
      useMediaStore.getState().setSource('slicer')
    } else {
      // Try to restore stashed source, or set to none
      const restored = useMediaStore.getState().restoreStashedSource()
      if (!restored) {
        useMediaStore.getState().setSource('none')
      }
    }
  },
  setProcessEffects: (processEffects) => set({ processEffects }),

  // Snapshot actions
  getSnapshot: () => {
    const state = get()
    return {
      // Buffer
      bufferSize: state.bufferSize,

      // Slices
      sliceCount: state.sliceCount,
      sliceSequenceMode: state.sliceSequenceMode,

      // Grains
      grainSize: state.grainSize,
      density: state.density,
      spray: state.spray,
      jitter: state.jitter,
      rate: state.rate,
      direction: state.direction,
      reverseProb: state.reverseProb,
      envelope: state.envelope,

      // Playback
      sliceProb: state.sliceProb,
      syncToBpm: state.syncToBpm,
      triggerRate: state.triggerRate,

      // Output
      outputMode: state.outputMode,
      wet: state.wet,
      blendMode: state.blendMode,
      opacity: state.opacity,
      enabled: state.enabled,
    }
  },

  loadSnapshot: (snapshot) => {
    set({
      // Buffer
      bufferSize: clamp(snapshot.bufferSize, 1, 10),

      // Slices
      sliceCount: snapshot.sliceCount,
      sliceSequenceMode: snapshot.sliceSequenceMode,

      // Grains
      grainSize: clamp(snapshot.grainSize, 10, 500),
      density: clamp(snapshot.density, 1, 8),
      spray: clamp(snapshot.spray, 0, 1),
      jitter: clamp(snapshot.jitter, 0, 1),
      rate: clamp(snapshot.rate, 0.25, 4),
      direction: snapshot.direction,
      reverseProb: clamp(snapshot.reverseProb, 0, 1),
      envelope: clamp(snapshot.envelope, 0, 100),

      // Playback
      sliceProb: clamp(snapshot.sliceProb, 0, 1),
      syncToBpm: snapshot.syncToBpm,
      triggerRate: Math.max(0.1, snapshot.triggerRate),

      // Output
      outputMode: snapshot.outputMode,
      wet: clamp(snapshot.wet, 0, 1),
      blendMode: snapshot.blendMode,
      opacity: clamp(snapshot.opacity, 0, 1),
      enabled: snapshot.enabled,
    })
  },
}))
