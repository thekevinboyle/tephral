import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { bjorklundPattern } from '../utils/bjorklund'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type EffectStepResolution = '1/4' | '1/8' | '1/16' | '1/32'

export type AudioReactiveSource = 'kick' | 'silence' | 'high' | 'mid' | 'low' | 'rms' | 'peak'

export type TimeScale = 0.25 | 0.5 | 0.75 | 1 | 1.5 | 2 | 3 | 4

export interface EuclideanConfig {
  hits: number
  rotation: number
}

export interface TrackAudioReactiveConfig {
  enabled: boolean
  source: AudioReactiveSource
  sensitivity: number      // 0.1-2.0, kick multiplier / auto-threshold sensitivity
}

const DEFAULT_AUDIO_REACTIVE: TrackAudioReactiveConfig = {
  enabled: false,
  source: 'kick',
  sensitivity: 1.0,
}

export interface EffectStep {
  active: boolean
  locks: Record<string, number | string>  // paramId -> raw value
  probability: number                      // 0-1
  condition: 'always' | 'fill'
  retrig: number                           // 0 = off, 2-8 = sub-step repeats
}

export interface EffectTrack {
  effectId: string
  mode: 'gate' | 'param'
  steps: EffectStep[]            // always 64 entries
  length: number                 // active step count (default 16)
  muted: boolean
  soloed: boolean
  midiGate: boolean              // MIDI note gates effect on/off
  audioGate: boolean             // audio-level gates effect on/off
  audioReactive: TrackAudioReactiveConfig  // per-track audio-driven stepping
  trackStep: number              // independent step position
  timeScale: TimeScale           // clock multiplier (default 1)
  euclidean: EuclideanConfig | null  // last euclidean config applied (null = manual)
}

export interface AutomationParam {
  effectId: string
  paramId: string      // short name: "amount"
  fullParamId: string  // full: "rgb_split.amount"
  label: string
  min: number
  max: number
  step: number
}

interface EffectSequencerState {
  // State
  tracks: Record<string, EffectTrack>
  bpm: number
  resolution: EffectStepResolution
  isPlaying: boolean
  currentStep: number
  stepPage: number
  selectedStep: { effectId: string; stepIndex: number } | null
  selectedSteps: { effectId: string; stepIndex: number }[]
  swing: number
  fillModeActive: boolean
  automationParam: AutomationParam | null
  trackAudioLevels: Record<string, number>  // per-track smoothed audio level for UI meters
  trackAutoThresholds: Record<string, number>  // per-track auto-computed threshold for UI display
  audioGateLevel: number                     // current audio gate amplitude (0-1)
  trackParamPanelOpen: string | null         // effectId of track with open param panel

  // Automation
  setAutomationParam: (param: AutomationParam) => void
  clearAutomationParam: () => void

  // Transport
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setResolution: (res: EffectStepResolution) => void
  setSwing: (swing: number) => void
  setStepPage: (page: number) => void
  setFillModeActive: (active: boolean) => void

  // Track management
  ensureTrack: (effectId: string) => void
  removeTrack: (effectId: string) => void
  setTrackMode: (effectId: string, mode: 'gate' | 'param') => void
  setTrackMuted: (effectId: string, muted: boolean) => void
  setTrackSoloed: (effectId: string, soloed: boolean) => void
  setTrackMidiGate: (effectId: string, enabled: boolean) => void
  setTrackAudioGate: (effectId: string, enabled: boolean) => void
  setTrackLength: (effectId: string, length: number) => void
  setTrackTimeScale: (effectId: string, scale: TimeScale) => void
  setStepRetrig: (effectId: string, stepIndex: number, retrig: number) => void
  applyEuclidean: (effectId: string, hits: number, rotation: number) => void
  setTrackParamPanelOpen: (effectId: string | null) => void
  setTrackAudioReactive: (effectId: string, config: Partial<TrackAudioReactiveConfig>) => void
  setTrackAudioReactiveEnabled: (effectId: string, enabled: boolean) => void
  advanceTrackStep: (effectId: string) => void
  resetTrackSteps: () => void
  setTrackAudioLevel: (effectId: string, level: number) => void
  setTrackAutoThreshold: (effectId: string, value: number) => void
  setAudioGateLevel: (level: number) => void

  // Step editing
  toggleStep: (effectId: string, stepIndex: number) => void
  setStepActive: (effectId: string, stepIndex: number, active: boolean) => void
  selectStep: (effectId: string, stepIndex: number) => void
  addToSelection: (effectId: string, stepIndex: number) => void
  clearSelection: () => void
  setStepLock: (effectId: string, stepIndex: number, paramId: string, value: number | string) => void
  clearStepLock: (effectId: string, stepIndex: number, paramId: string) => void
  clearAllStepLocks: (effectId: string, stepIndex: number) => void
  setStepProbability: (effectId: string, stepIndex: number, prob: number) => void

  // Utilities
  randomizeTrack: (effectId: string, density?: number) => void
  randomizeAllTracks: (density?: number) => void
  randomizeLocks: (effectId: string, params: { id: string; min: number; max: number; step: number }[]) => void
  clearTrack: (effectId: string) => void

  // Playback engine
  advanceStep: () => void
  resetPlayhead: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const createDefaultStep = (): EffectStep => ({
  active: false,
  locks: {},
  probability: 1,
  condition: 'always',
  retrig: 0,
})

const createDefaultTrack = (effectId: string): EffectTrack => ({
  effectId,
  mode: 'gate',
  steps: Array.from({ length: 32 }, createDefaultStep),
  length: 32,
  muted: false,
  soloed: false,
  midiGate: false,
  audioGate: false,
  audioReactive: { ...DEFAULT_AUDIO_REACTIVE },
  trackStep: 0,
  timeScale: 1,
  euclidean: null,
})

// Immutable step update helper
const updateStep = (
  tracks: Record<string, EffectTrack>,
  effectId: string,
  stepIndex: number,
  updater: (step: EffectStep) => EffectStep,
): Record<string, EffectTrack> => {
  const track = tracks[effectId]
  if (!track || stepIndex < 0 || stepIndex >= track.steps.length) return tracks
  const newSteps = [...track.steps]
  newSteps[stepIndex] = updater(newSteps[stepIndex])
  return { ...tracks, [effectId]: { ...track, steps: newSteps } }
}

// ═══════════════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════════════

export const useEffectSequencerStore = create<EffectSequencerState>()(persist((set, get) => ({
  // Initial state
  tracks: {},
  bpm: 120,
  resolution: '1/16',
  isPlaying: false,
  currentStep: 0,
  stepPage: 0,
  selectedStep: null,
  selectedSteps: [],
  swing: 0,
  fillModeActive: false,
  automationParam: null,
  trackAudioLevels: {},
  trackAutoThresholds: {},
  audioGateLevel: 0,
  trackParamPanelOpen: null,

  // ─── Transport ─────────────────────────────────────────────────────────

  play: () => set({ isPlaying: true }),

  stop: () => {
    const state = get()
    const newTracks: Record<string, EffectTrack> = {}
    for (const [id, track] of Object.entries(state.tracks)) {
      newTracks[id] = { ...track, trackStep: 0 }
    }
    set({ isPlaying: false, currentStep: 0, tracks: newTracks, trackAudioLevels: {}, trackAutoThresholds: {} })
  },

  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),

  setResolution: (resolution) => set({ resolution }),

  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, swing)) }),

  setStepPage: (page) => set({ stepPage: Math.max(0, Math.min(3, page)) }),

  setFillModeActive: (active) => set({ fillModeActive: active }),

  // ─── Automation Target ──────────────────────────────────────────────────

  setAutomationParam: (param) => set({ automationParam: param }),

  clearAutomationParam: () => set({ automationParam: null }),

  // ─── Track Management ──────────────────────────────────────────────────

  ensureTrack: (effectId) => {
    if (get().tracks[effectId]) return
    set((state) => ({
      tracks: { ...state.tracks, [effectId]: createDefaultTrack(effectId) },
    }))
  },

  removeTrack: (effectId) => {
    set((state) => {
      const { [effectId]: _, ...rest } = state.tracks
      return { tracks: rest }
    })
  },

  setTrackMode: (effectId, mode) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, mode } } }
    })
  },

  setTrackMuted: (effectId, muted) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, muted } } }
    })
  },

  setTrackSoloed: (effectId, soloed) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, soloed } } }
    })
  },

  setTrackMidiGate: (effectId, enabled) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, midiGate: enabled } } }
    })
  },

  setTrackAudioGate: (effectId, enabled) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, audioGate: enabled } } }
    })
  },

  setTrackLength: (effectId, length) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return {
        tracks: {
          ...state.tracks,
          [effectId]: { ...track, length: Math.max(1, Math.min(32, length)) },
        },
      }
    })
  },

  setTrackTimeScale: (effectId, scale) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, timeScale: scale } } }
    })
  },

  setStepRetrig: (effectId, stepIndex, retrig) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        retrig,
      })),
    }))
  },

  applyEuclidean: (effectId, hits, rotation) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const pattern = bjorklundPattern(hits, track.length, rotation)
      const newSteps = track.steps.map((step, i) =>
        i < track.length ? { ...step, active: pattern[i] ?? false } : step
      )
      return {
        tracks: {
          ...state.tracks,
          [effectId]: { ...track, steps: newSteps, euclidean: { hits, rotation } },
        },
      }
    })
  },

  setTrackParamPanelOpen: (effectId) => set({ trackParamPanelOpen: effectId }),

  setTrackAudioReactive: (effectId, config) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return {
        tracks: {
          ...state.tracks,
          [effectId]: {
            ...track,
            audioReactive: { ...track.audioReactive, ...config },
          },
        },
      }
    })
  },

  setTrackAudioReactiveEnabled: (effectId, enabled) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state

      // When enabling audio reactive, auto-activate all steps within track length
      // so audio triggers have immediate visible effect
      const newSteps = enabled
        ? track.steps.map((step, i) =>
            i < track.length && !step.active ? { ...step, active: true } : step,
          )
        : track.steps

      return {
        tracks: {
          ...state.tracks,
          [effectId]: {
            ...track,
            steps: newSteps,
            audioReactive: { ...track.audioReactive, enabled },
            trackStep: 0,
          },
        },
      }
    })
  },

  advanceTrackStep: (effectId) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return {
        tracks: {
          ...state.tracks,
          [effectId]: {
            ...track,
            trackStep: (track.trackStep + 1) % track.length,
          },
        },
      }
    })
  },

  resetTrackSteps: () => {
    set((state) => {
      const newTracks: Record<string, EffectTrack> = {}
      for (const [id, track] of Object.entries(state.tracks)) {
        newTracks[id] = { ...track, trackStep: 0 }
      }
      return { tracks: newTracks, trackAudioLevels: {}, trackAutoThresholds: {} }
    })
  },

  setTrackAudioLevel: (effectId, level) => {
    set((state) => ({
      trackAudioLevels: { ...state.trackAudioLevels, [effectId]: level },
    }))
  },

  setTrackAutoThreshold: (effectId, value) => {
    set((state) => ({
      trackAutoThresholds: { ...state.trackAutoThresholds, [effectId]: value },
    }))
  },

  setAudioGateLevel: (level) => {
    set({ audioGateLevel: level })
  },

  // ─── Step Editing ──────────────────────────────────────────────────────

  toggleStep: (effectId, stepIndex) => {
    set((state) => {
      const newTracks = updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        active: !step.active,
      }))
      // Clear euclidean config on manual edit
      const track = newTracks[effectId]
      if (track?.euclidean) {
        newTracks[effectId] = { ...track, euclidean: null }
      }
      return { tracks: newTracks }
    })
  },

  setStepActive: (effectId, stepIndex, active) => {
    set((state) => {
      const newTracks = updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        active,
      }))
      const track = newTracks[effectId]
      if (track?.euclidean) {
        newTracks[effectId] = { ...track, euclidean: null }
      }
      return { tracks: newTracks }
    })
  },

  selectStep: (effectId, stepIndex) => {
    set({
      selectedStep: { effectId, stepIndex },
      selectedSteps: [{ effectId, stepIndex }],
    })
  },

  addToSelection: (effectId, stepIndex) => {
    set((state) => {
      const entry = { effectId, stepIndex }
      const already = state.selectedSteps.some(
        (s) => s.effectId === effectId && s.stepIndex === stepIndex,
      )
      if (already) {
        // Deselect
        const filtered = state.selectedSteps.filter(
          (s) => !(s.effectId === effectId && s.stepIndex === stepIndex),
        )
        return {
          selectedSteps: filtered,
          selectedStep: filtered.length > 0 ? filtered[filtered.length - 1] : null,
        }
      }
      const newSelection = [...state.selectedSteps, entry]
      return {
        selectedSteps: newSelection,
        selectedStep: entry,
      }
    })
  },

  clearSelection: () => set({ selectedStep: null, selectedSteps: [] }),

  setStepLock: (effectId, stepIndex, paramId, value) => {
    const state = get()
    // Apply to all selected steps if multi-selecting on same effect
    const targets = state.selectedSteps.length > 1
      ? state.selectedSteps.filter((s) => s.effectId === effectId)
      : [{ effectId, stepIndex }]

    set((state) => {
      let tracks = state.tracks
      for (const target of targets) {
        tracks = updateStep(tracks, target.effectId, target.stepIndex, (step) => ({
          ...step,
          locks: { ...step.locks, [paramId]: value },
        }))
      }
      return { tracks }
    })
  },

  clearStepLock: (effectId, stepIndex, paramId) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => {
        const { [paramId]: _, ...rest } = step.locks
        return { ...step, locks: rest }
      }),
    }))
  },

  clearAllStepLocks: (effectId, stepIndex) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        locks: {},
      })),
    }))
  },

  setStepProbability: (effectId, stepIndex, prob) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        probability: Math.max(0, Math.min(1, prob)),
      })),
    }))
  },

  // ─── Utilities ────────────────────────────────────────────────────────

  randomizeTrack: (effectId, density = 0.4) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const newSteps = track.steps.map((step) => ({
        ...step,
        active: Math.random() < density,
      }))
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  randomizeAllTracks: (density = 0.4) => {
    set((state) => {
      const newTracks = { ...state.tracks }
      for (const effectId of Object.keys(newTracks)) {
        const track = newTracks[effectId]
        newTracks[effectId] = {
          ...track,
          steps: track.steps.map((step) => ({
            ...step,
            active: Math.random() < density,
          })),
        }
      }
      return { tracks: newTracks }
    })
  },

  randomizeLocks: (effectId, params) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track || params.length === 0) return state
      // Pick a random subset of parameters (1 to half, at least 1)
      const count = Math.max(1, Math.floor(Math.random() * Math.ceil(params.length / 2)) + 1)
      const shuffled = [...params].sort(() => Math.random() - 0.5)
      const chosen = shuffled.slice(0, count)
      const newSteps = track.steps.map((step, i) => {
        if (i >= track.length || !step.active) return step
        const locks = { ...step.locks }
        for (const p of chosen) {
          const range = p.max - p.min
          const raw = p.min + Math.random() * range
          locks[p.id] = Math.round(raw / p.step) * p.step
        }
        return { ...step, locks }
      })
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  clearTrack: (effectId) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const newSteps = track.steps.map((step) => ({
        ...step,
        active: false,
        locks: {},
      }))
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  // ─── Playback Engine ───────────────────────────────────────────────────

  advanceStep: () => {
    set((state) => ({
      currentStep: (state.currentStep + 1) % 32,
    }))
  },

  resetPlayhead: () => set({ currentStep: 0 }),
}), {
  name: 'effect-sequencer-storage',
  partialize: (state) => ({
    bpm: state.bpm,
    resolution: state.resolution,
    swing: state.swing,
  }),
}))
